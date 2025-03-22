// controllers/qualityQuestionsController.js
const { callOpenAI } = require('../services/openaiService');

async function generateQualityQuestions(req, res) {
  const { title, objective } = req.body;

  if (!title || !objective) {
    return res.status(400).json({
      error: 'Debe proporcionar el título y el objetivo del estudio.'
    });
  }

  const prompt = `
Eres un experto en metodología de investigación y evaluación crítica de estudios.
Con base en el siguiente título y objetivo:

- Título: ${title}
- Objetivo: ${objective}

Genera un arreglo JSON con preguntas de evaluación de calidad para determinar si un estudio debe ser aceptado en una revisión sistemática.

Las preguntas deben abordar: diseño metodológico, relevancia del estudio, validez de resultados, claridad en el reporte, y riesgo de sesgo.

El formato debe ser exactamente:
{
  "quality_questions": [
    "Pregunta 1",
    "Pregunta 2",
    ...
  ]
}

No incluyas texto adicional ni explicaciones, solo el JSON.
`;

  try {
    const messages = [
      { role: 'system', content: 'Eres un asistente experto en revisión sistemática y evaluación de calidad de estudios.' },
      { role: 'user', content: prompt }
    ];

    const generatedText = await callOpenAI(messages, 'gpt-4', 0.7);
    const cleaned = generatedText.trim();
    const parsed = JSON.parse(cleaned);

    res.status(200).json(parsed);
  } catch (error) {
    console.error('Error al generar preguntas de calidad:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud con OpenAI' });
  }
}

module.exports = { generateQualityQuestions };
