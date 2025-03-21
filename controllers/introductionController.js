// controllers/introductionController.js
const { callOpenAI } = require('../services/openaiService');

async function generateIntroduction(req, res) {
  const { title, description, objective, area_conocimiento, tipo_investigacion } = req.body;

  // Validar campos obligatorios
  if (!title || !description || !objective) {
    return res.status(400).json({ error: 'Faltan datos obligatorios en la solicitud (title, description, objective)' });
  }

  // Construir el prompt para OpenAI
  const prompt = `
Utilizando la siguiente información, genera un borrador de la sección de Introducción para un artículo científico:
- Título de la revisión: ${title}
- Descripción: ${description}
- Objetivo: ${objective}
- Área de Conocimiento: ${area_conocimiento || 'No especificado'}
- Tipo de Investigación: ${tipo_investigacion || 'No especificado'}

La Introducción debe presentar el contexto, la motivación y la relevancia del estudio, en un tono académico y formal.
  `;

  try {
    // Preparar mensajes para OpenAI
    const messages = [
      { role: 'system', content: 'Eres un asistente experto en redacción académica.' },
      { role: 'user', content: prompt }
    ];

    // Llamar al servicio centralizado
    let generatedText = await callOpenAI(messages, 'gpt-4-turbo', 0.7);
    generatedText = generatedText.trim();

    res.status(200).json({ introduction: generatedText });
  } catch (error) {
    console.error('Error al llamar a OpenAI:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud con OpenAI' });
  }
}

module.exports = { generateIntroduction };
