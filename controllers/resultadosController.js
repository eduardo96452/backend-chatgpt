// controllers/resultadosController.js
const { callOpenAI } = require('../services/openaiService');

async function generateResultados(req, res) {
  const { studies_data, extraction_responses } = req.body;

  if (!studies_data || !extraction_responses) {
    return res.status(400).json({ error: 'Faltan datos obligatorios en la solicitud (studies_data, extraction_responses)' });
  }

  // Construir el prompt para OpenAI
  const prompt = `
Utilizando la siguiente información, genera un borrador de la sección de Resultados para un artículo científico:
- Datos de los estudios (aceptados, duplicados, rechazados): ${studies_data}
- Respuestas de evaluación y extracción de datos: ${extraction_responses}

Resume los hallazgos principales de la revisión sistemática, presentando estadísticas clave y patrones identificados en un tono académico.
  `;

  try {
    // Preparar los mensajes para la llamada a OpenAI
    const messages = [
      { role: 'system', content: 'Eres un asistente experto en redacción académica y análisis de datos.' },
      { role: 'user', content: prompt }
    ];

    // Llamar al servicio de OpenAI
    let generatedText = await callOpenAI(messages, 'gpt-4', 0.7);
    generatedText = generatedText.trim();

    res.status(200).json({ resultados: generatedText });
  } catch (error) {
    console.error('Error al llamar a OpenAI:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud con OpenAI' });
  }
}

module.exports = { generateResultados };
