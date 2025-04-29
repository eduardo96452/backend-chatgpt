// controllers/suggestionsController.js
const axios    = require('axios');
const pdfParse = require('pdf-parse');
const { callOpenAI } = require('../services/openaiService');

function tokenize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')       // quita tildes
    .replace(/[^a-z0-9\s]/g, ' ')          // solo letras y números
    .split(/\s+/)
    .filter(w => w.length > 2 && w !== 'the' && w !== 'and');
}

async function generateExtractionSuggestions(req, res) {
  const { url, title, questions } = req.body;

  if (!url || !title || !Array.isArray(questions) || !questions.length) {
    return res.status(400).json({ error: 'Se requieren url, title y questions.' });
  }

  try {
    /* 1. Descarga PDF */
    const pdfResp = await axios.get(url, { responseType: 'arraybuffer' });

    /* 2. Extrae texto */
    const parsed   = await pdfParse(pdfResp.data);
    const fullText = (parsed.text || '').slice(0, 120_000);

    /* 3. Verifica coincidencia con el título */
    const titleWords = tokenize(title);
    const textWords  = new Set(tokenize(fullText));

    const matches = titleWords.filter(w => textWords.has(w)).length;
    const ratio   = matches / titleWords.length;   // 0-1

    if (ratio < 0.4) {   // menos del 40 % de coincidencia
      return res.status(412).json({
        error: 'El PDF no parece corresponder al título proporcionado.',
      });
    }

    /* 4. Construye prompt para GPT */
    const qText = questions
      .map((q, i) => `${i + 1}. ${q.pregunta} (Tipo: ${q.tipoRespuesta})`)
      .join('\n');

    const messages = [
      {
        role: 'system',
        content:
          'Eres un asistente experto en extracción de datos. ' +
          'Responde solo con la información del artículo proporcionado.',
      },
      {
        role: 'user',
        content: `
Título del artículo: ${title}

Texto del artículo:
"""${fullText}"""

Responde las preguntas de forma breve y devuelve JSON:
{
  "suggestions":[{"answer":"..."}, …]
}

Preguntas:
${qText}`.trim(),
      },
    ];

    /* 5. Llama a OpenAI y devuelve sugerencias */
    const aiRaw = await callOpenAI(messages);
    const suggestions = JSON.parse(aiRaw).suggestions;

    res.json({ suggestions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error procesando PDF o OpenAI.' });
  }
}

module.exports = { generateExtractionSuggestions };
