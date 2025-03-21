// controllers/dataExtractionController.js
const { callOpenAI } = require('../services/openaiService');

async function generateDataExtractionQuestions(req, res) {
  const { title, objective, numberOfQuestions } = req.body;

  // Validaciones básicas
  if (!title || !objective || !numberOfQuestions) {
    return res.status(400).json({
      error: 'Debe proporcionar título, objetivo y la cantidad de preguntas que desea generar.'
    });
  }

  // Construcción del prompt para OpenAI
  const prompt = `
      Eres un experto en revisiones sistemáticas de literatura.
      Basado en el siguiente estudio:
      - Título: ${title}
      - Objetivo: ${objective}

      Genera un arreglo JSON con ${numberOfQuestions} preguntas de extracción de datos,
      donde cada objeto incluya:
      - "pregunta": la pregunta a realizar
      - "tipo": un valor que puede ser "Booleano", "Texto", "Decimal", "Entero" o "Fecha"

      El formato debe ser exactamente:
      [
        { "pregunta": "Texto de la pregunta 1", "tipo": "Booleano" },
        { "pregunta": "Texto de la pregunta 2", "tipo": "Texto" }
        ...
      ]

      No incluyas explicaciones adicionales ni rodees la respuesta de texto extra;
      solamente devuelve ese arreglo en JSON.
  `;

  try {
    // Preparar los mensajes para la llamada a OpenAI
    const messages = [
      { role: 'system', content: 'Eres un asistente experto en metodología científica.' },
      { role: 'user', content: prompt }
    ];

    // Llamar al servicio de OpenAI
    let generatedText = await callOpenAI(messages);
    generatedText = generatedText.trim();

    // Intentar parsear la respuesta como un arreglo JSON válido
    let generatedQuestions;
    try {
      generatedQuestions = JSON.parse(generatedText);
    } catch (err) {
      console.error('Error al parsear JSON:', err);
      return res.status(500).json({ error: 'La respuesta no es un JSON válido' });
    }

    res.status(200).json({ questions: generatedQuestions });
  } catch (error) {
    console.error('Error al generar preguntas de extracción de datos:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud.' });
  }
}

module.exports = { generateDataExtractionQuestions };
