// controllers/suggestionsController.js
const axios     = require('axios');
const pdfParse  = require('pdf-parse');
const { callOpenAI } = require('../services/openaiService');

/* ───────── helpers ───────── */
function tokenize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !['the', 'and'].includes(w));
}
function castAnswer(ans, tipo) {
  if (tipo === 'Booleano') {
    const t = ans.toString().toLowerCase();
    return t.includes('si') || t.includes('yes') || t === 'true';
  }
  if (tipo === 'Entero') {
    const n = parseInt(ans, 10);
    return Number.isFinite(n) ? n : null;
  }
  if (tipo === 'Decimal') {
    const n = parseFloat(ans.toString().replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  if (tipo === 'Fecha') {
    const m = ans.match(/(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : null;
  }
  return ans.toString().trim();       // Texto por defecto
}

/* ───────── controlador ───────── */
async function generateExtractionSuggestions(req, res) {
  const { url, title, questions } = req.body;
  if (!url || !title || !Array.isArray(questions) || !questions.length) {
    return res.status(400).json({ error: 'Se requieren url, title y questions.' });
  }

  try {
    /* 1. Descargar PDF */
    const pdfResp  = await axios.get(url, { responseType: 'arraybuffer' });
    /* 2. Extraer texto */
    const parsed   = await pdfParse(pdfResp.data);
    const fullText = (parsed.text || '').slice(0, 120_000);

    /* 3. Comprobar coincidencia con título */
    const titleWords = tokenize(title);
    const textSet    = new Set(tokenize(fullText));
    const matches    = titleWords.filter(w => textSet.has(w)).length;
    if (matches / titleWords.length < 0.4) {
      return res.status(412).json({ error: 'El PDF no concuerda con el título.' });
    }

    /* 4. Prompt con ejemplo */
    const qText = questions
      .map((q, i) => `${i + 1}. ${q.pregunta} (Tipo: ${q.tipoRespuesta})`)
      .join('\n');

    const messages = [
      {
        role: 'system',
        content:
          'Eres un asistente experto en extracción de datos. ' +
          'Responde solo con la información del texto proporcionado.',
      },
      {
        role: 'user',
        content: `
Título: ${title}

Texto del artículo:
"""${fullText}"""

FORMATO DE RESPUESTA:
{
  "suggestions":[{"answer":"respuesta 1"}, …]
}

Ejemplo:
Preguntas = [
  {pregunta:"¿Año?",tipoRespuesta:"Entero"},
  {pregunta:"¿Usa IA?",tipoRespuesta:"Booleano"}
]
Salida correcta =
{
  "suggestions":[
    {"answer":2024},
    {"answer":true}
  ]
}

Preguntas reales:
${qText}`.trim(),
      },
    ];

    /* 5. Llamar a OpenAI */
    const aiRaw = (await callOpenAI(messages)).trim();

    /* 6. Parsear salida */
    let suggestions;
    try {
      suggestions = JSON.parse(aiRaw).suggestions;
    } catch {
      // Fallback: cada línea no vacía
      suggestions = aiRaw
        .split(/\n+/)
        .filter(l => l.trim())
        .map(l => ({ answer: l.replace(/^[\d•\-]+\s*/, '').trim() }));
    }

    /* 7. Normalizar tipos */
    suggestions = suggestions.map((s, idx) => ({
      answer: castAnswer(s.answer, questions[idx]?.tipoRespuesta || 'Texto'),
    }));

    return res.json({ suggestions });
  } catch (err) {
    console.error('PDF/OpenAI error:', err);
    return res.status(500).json({ error: 'Error procesando PDF o OpenAI.' });
  }
}

module.exports = { generateExtractionSuggestions };