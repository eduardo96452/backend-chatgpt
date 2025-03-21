// controllers/limitacionesController.js
const { callOpenAI } = require('../services/openaiService');

async function generateLimitaciones(req, res) {
  const { methodological_issues, search_limitations } = req.body;

  if (!methodological_issues || !search_limitations) {
    return res.status(400).json({ error: 'Faltan datos obligatorios en la solicitud (methodological_issues, search_limitations)' });
  }

  // Construir el prompt para OpenAI
  const prompt = `
Utilizando la siguiente información, genera un borrador de la sección de Limitaciones para un artículo científico:
- Problemas metodológicos: ${methodological_issues}
- Limitaciones de la búsqueda y selección de estudios: ${search_limitations}

Describe de forma clara y concisa las limitaciones que afectan la interpretación de los resultados, en un tono académico.
  `;

  try {
    // Preparar mensajes para la llamada a OpenAI
    const messages = [
      { role: 'system', content: 'Eres un asistente experto en redacción académica.' },
      { role: 'user', content: prompt }
    ];

    let generatedText = await callOpenAI(messages, 'gpt-4', 0.7);
    generatedText = generatedText.trim();

    res.status(200).json({ limitaciones: generatedText });
  } catch (error) {
    console.error('Error al llamar a OpenAI:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud con OpenAI' });
  }
}

module.exports = { generateLimitaciones };
