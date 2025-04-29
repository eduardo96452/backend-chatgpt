// controllers/suggestionsController.js
const axios     = require('axios');
const pdfParse  = require('pdf-parse');
const { callOpenAI } = require('../services/openaiService');

async function generateExtractionSuggestions(req, res) {
  const { url, questions } = req.body;

  if (!url || !Array.isArray(questions) || !questions.length) {
    return res.status(400).json({ error: 'Debe proporcionar URL y preguntas.' });
  }

  try {
    /* 1. Descargar PDF como ArrayBuffer */
    const pdfResp = await axios.get(url, { responseType: 'arraybuffer' });

    /* 2. Extraer texto (pdf-parse) */
    const parsed = await pdfParse(pdfResp.data);
    let fullText = parsed.text || '';

    /* 3. Recortar si es muy grande (máx ~120k caracteres ≈ 45 K tokens) */
    const MAX_CHARS = 120_000;
    if (fullText.length > MAX_CHARS) {
      fullText = fullText.slice(0, MAX_CHARS);
    }

    /* 4. Construir prompt */
    const qText = questions
      .map((q, i) => `${i + 1}. ${q.pregunta}  (Tipo: ${q.tipoRespuesta})`)
      .join('\n');

    const messages = [
      {
        role: 'system',
        content:
          'Eres un asistente experto en extracción de datos. ' +
          'Responde solo con la información que encuentres en el texto proporcionado.',
      },
      {
        role: 'user',
        content: `
Texto del artículo (puede estar truncado):
"""${fullText}"""

Responde cada pregunta con una frase corta acorde al tipo indicado.
Devuelve JSON EXACTAMENTE con esta forma:

{
  "suggestions":[
    {"answer":"respuesta 1"},
    {"answer":"respuesta 2"},
    ...
  ]
}

Preguntas:
${qText}
        `.trim(),
      },
    ];

    /* 5. Llamar a OpenAI */
    const aiResponse = await callOpenAI(messages);

    /* 6. Intentar parsear la respuesta como JSON */
    let suggestions;
    try {
      suggestions = JSON.parse(aiResponse).suggestions;
    } catch (e) {
      console.error('No se pudo parsear JSON, respuesta cruda:', aiResponse);
      return res.status(500).json({ error: 'OpenAI devolvió un formato inválido.' });
    }

    res.json({ suggestions });
  } catch (err) {
    console.error('Fallo en extracción:', err.message);
    res.status(500).json({ error: 'Error procesando PDF.' });
  }
}

module.exports = { generateExtractionSuggestions };
