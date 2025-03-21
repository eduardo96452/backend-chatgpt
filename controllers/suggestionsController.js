// controllers/suggestionsController.js
const { callOpenAI } = require('../services/openaiService');

async function generateExtractionSuggestions(req, res) {
  const { url, questions } = req.body;
  
  if (!url || !questions || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Debe proporcionar una URL y una lista de preguntas de extracción.' });
  }
  
  try {
    // Construir una cadena que enumere las preguntas y su tipo de respuesta.
    const questionsText = questions
      .map((q, index) => `${index + 1}. ${q.pregunta} (Tipo: ${q.tipoRespuesta})`)
      .join("\n");

    // Construir el prompt para GPT-4.
    const prompt = `
Tienes la siguiente URL de un artículo científico:
${url}

Y las siguientes preguntas de extracción de datos:
${questionsText}

Para cada pregunta, proporciona una sugerencia de respuesta que se ajuste al tipo de respuesta indicado, sin explicaciones adicionales.

Responde en formato JSON siguiendo este ejemplo:
{
  "suggestions": [
    { "answer": "Respuesta sugerida para la pregunta 1" },
    { "answer": "Respuesta sugerida para la pregunta 2" }
    // ...
  ]
}
    `;

    const messages = [
      { role: 'system', content: 'Eres un asistente experto en extracción de datos y en generar sugerencias precisas para investigaciones.' },
      { role: 'user', content: prompt }
    ];

    // Llamar al servicio de OpenAI
    let generatedContent = await callOpenAI(messages, 'gpt-4-turbo', 0.7);
    generatedContent = generatedContent.trim();
    
    let suggestions;
    try {
      // Intentar parsear la respuesta como JSON
      suggestions = JSON.parse(generatedContent).suggestions;
    } catch (e) {
      console.error('Error al parsear JSON:', e);
      // En caso de fallo, se devuelve el contenido crudo
      suggestions = generatedContent;
    }
    
    res.status(200).json({ suggestions });
  } catch (error) {
    console.error('Error al generar sugerencias de extracción:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud con OpenAI' });
  }
}

module.exports = { generateExtractionSuggestions };
