// controllers/introductionController.js
const { callOpenAI } = require('../services/openaiService');
const axios = require('axios');

/**
 * Busca una referencia real en CrossRef usando un snippet de texto
 * y devuelve una cita en formato APA 7 para el primer resultado.
 */
async function fetchRealReference(query) {
  try {
    const resp = await axios.get('https://api.crossref.org/works', {
      params: { query, rows: 1 }
    });
    const item = resp.data.message.items[0];
    if (!item) return null;

    // Formatear autores: "Apellido, I.; Apellido, I."
    const authors = (item.author || [])
      .map(a => {
        const family = a.family || '';
        const givenInitial = a.given ? a.given.trim().charAt(0) + '.' : '';
        return givenInitial ? `${family}, ${givenInitial}` : family;
      })
      .join('; ');

    const year    = item.published?.['date-parts']?.[0]?.[0] || '';
    const title   = Array.isArray(item.title) ? item.title[0] : item.title;
    const journal = Array.isArray(item['container-title']) ? item['container-title'][0] : item['container-title'];
    const volume  = item.volume || '';
    const issue   = item.issue  ? `(${item.issue})` : '';
    const pages   = item.page   ? `, ${item.page}` : '';

    return `${authors} (${year}). ${title}. *${journal}*, ${volume}${issue}${pages}.`;
  } catch (err) {
    console.error('CrossRef error:', err.message);
    return null;
  }
}

async function generateIntroduction(req, res) {
  const {
    title,
    description,
    objective,
    area_conocimiento,
    tipo_investigacion
  } = req.body;

  if (!title || !description || !objective) {
    return res.status(400).json({
      error: 'Faltan datos obligatorios (title, description, objective).'
    });
  }

  // 1) Construir el prompt para GPT
  const prompt = `
Genera **exactamente** el siguiente JSON, sin texto adicional:
{
  "introduction": "<cuerpo>",
  "references": ["<APA1>", "<APA2>", /* … */]
}
Reglas para "introduction":
- Longitud 3900–4100 caracteres.
- Párrafos de 2–3 oraciones.
- Marcadores IEEE [1], [2], …
- Tono académico-formal.
- Máximo 1000 tokens.
- Concluye con:
  “Este documento se organizó de la siguiente manera: en la sección 2 se abordó los trabajos relacionados, en la sección 3 se presentó la metodología, en la sección 4 se establecieron los resultados, en la sección 5 se desarrolló la discusión, en la sección 6 se describieron las limitaciones y en la sección 7 se detallaron las conclusiones.”
Reglas para "references":
- 4–6 referencias reales en formato APA 7.
Datos:
Título: ${title}
Descripción: ${description}
Objetivo: ${objective}
Área de conocimiento: ${area_conocimiento || 'No especificado'}
Tipo de investigación: ${tipo_investigacion || 'No especificado'}
`;

  const messages = [
    { role: 'system', content: 'Eres un asistente experto en redacción académica.' },
    { role: 'user',   content: prompt }
  ];

  try {
    // 2) Generar la sugerencia
    let aiRaw = await callOpenAI(messages, 'gpt-4o-mini', 0.3, 1000);
    aiRaw = aiRaw.trim();

    // 3) Eliminar fences Markdown si existen
    if (aiRaw.startsWith('```')) {
      const m = aiRaw.match(/```(?:json)?\s*([\s\S]*?)```$/i);
      if (m) aiRaw = m[1].trim();
    }

    // 4) Extraer sólo el bloque JSON final
    const jsonMatch = aiRaw.match(/\{[\s\S]*\}$/);
    const jsonString = jsonMatch ? jsonMatch[0] : aiRaw;

    // 5) Parsear JSON
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (parseErr) {
      console.error('Error parseando JSON de IA:', parseErr.message);
      return res.json({
        introduction: aiRaw,
        references: []
      });
    }

    const bodyText = parsed.introduction;

    // 6) Extraer marcadores IEEE [n]
    const markers = Array.from(bodyText.matchAll(/\[(\d+)\]/g))
                         .map(m => parseInt(m[1], 10));
    const uniqueMarkers = [...new Set(markers)].sort((a, b) => a - b);

    // 7) Para cada marcador, extraer snippet y buscar referencia real
    const realRefs = [];
    for (const idx of uniqueMarkers) {
      // extraer la frase que contiene el marcador [idx]
      const regex = new RegExp(`([^\\.]*?\\[${idx}\\][^\\.]*\\.)`, 'i');
      const match = bodyText.match(regex);
      const snippet = match ? match[1] : `${title} ${objective}`.slice(0, 200);

      const ref = await fetchRealReference(snippet);
      realRefs.push(ref || `Referencia no encontrada para marcador [${idx}]`);
    }

    // 8) Responder con el texto y referencias reales
    return res.json({
      introduction: bodyText,
      references: realRefs
    });

  } catch (err) {
    console.error('Error al generar introducción:', err.message);
    return res.status(500).json({
      error: 'Error al procesar la introducción con OpenAI.'
    });
  }
}

module.exports = { generateIntroduction };
