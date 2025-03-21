// controllers/discussionController.js
const { callOpenAI } = require('../services/openaiService');

async function generateDiscussion(req, res) {
  const { results_summary, literature_review } = req.body;

  if (!results_summary || !literature_review) {
    return res.status(400).json({ error: 'Faltan datos obligatorios en la solicitud (results_summary, literature_review)' });
  }

  const prompt = `
Utilizando la siguiente información, genera un borrador de la sección de Discusión para un artículo científico:
- Resumen de resultados: ${results_summary}
- Comparación con la literatura existente: ${literature_review}

Analiza e interpreta los hallazgos, discutiendo sus implicaciones, limitaciones y posibles direcciones futuras en un tono académico.
  `;

  try {
    const messages = [
      { role: 'system', content: 'Eres un asistente experto en redacción académica y análisis crítico.' },
      { role: 'user', content: prompt }
    ];

    let generatedText = await callOpenAI(messages, 'gpt-4', 0.7);
    generatedText = generatedText.trim();

    res.status(200).json({ discusion: generatedText });
  } catch (error) {
    console.error('Error al llamar a OpenAI:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud con OpenAI' });
  }
}

module.exports = { generateDiscussion };
