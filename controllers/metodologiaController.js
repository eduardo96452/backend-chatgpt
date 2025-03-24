// controllers/metodologiaController.js
const { callOpenAI } = require('../services/openaiService');

async function generateMetodologia(req, res) {
  const { title, description, objetivo, tipo_investigacion } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Falta el título (title) en la solicitud.' });
  }

  const prompt = `
Eres un experto en redacción académica. Basado en la siguiente información, genera un borrador de la sección de Metodología para un artículo de investigación:

- Título: ${title}
- Objetivo: ${objetivo || 'No especificado'}
- Tipo de investigación: ${tipo_investigacion || 'No especificado'}
- Descripción adicional: ${description || 'Ninguna'}

Asegúrate de describir de forma clara el diseño, participantes (si aplica), procedimientos y métodos de análisis.
  `;

  try {
    const messages = [
      { role: 'system', content: 'Eres un asistente experto en redacción académica.' },
      { role: 'user', content: prompt }
    ];

    let generatedText = await callOpenAI(messages);
    generatedText = generatedText.trim();

    res.status(200).json({ metodologia: generatedText });
  } catch (error) {
    console.error('Error al llamar a OpenAI:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud de Metodología con IA.' });
  }
}

module.exports = { generateMetodologia };
