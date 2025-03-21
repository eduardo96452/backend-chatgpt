// controllers/researchQuestionsController.js
const { callOpenAI } = require('../services/openaiService');

async function generateResearchQuestions(req, res) {
  const { title, objective, methodology, numQuestions, tipoInvestigacion } = req.body;

  // Validación de campos obligatorios
  if (!title || !objective || !methodology) {
    return res.status(400).json({ error: 'Faltan datos en la solicitud (title, objective, methodology)' });
  }

  // Determinar la cantidad de preguntas a generar (por defecto 3)
  const questionsCount = numQuestions && Number(numQuestions) > 0 ? Number(numQuestions) : 3;

  // Construir una sección opcional para "tipoInvestigacion"
  let investigationPart = '';
  if (tipoInvestigacion && tipoInvestigacion.trim()) {
    investigationPart = `y considerando que la investigación es de tipo "${tipoInvestigacion.trim()}" `;
  }

  // Construir el prompt para OpenAI
  const prompt = `
  Eres un asistente experto en investigación académica. 
  Con base en la metodología "${methodology}", el título "${title}" y el objetivo "${objective}" ${investigationPart}
  genera ${questionsCount} preguntas de investigación en formato JSON. 
  Ejemplo de salida:
  {
    "questions": [
      "¿Cómo ha evolucionado el uso de la inteligencia artificial en la detección de enfermedades?",
      "¿Qué impacto tienen los modelos de aprendizaje profundo en la precisión del diagnóstico médico?",
      "Pregunta 3..."
    ]
  }
  Devuelve únicamente el JSON sin ningún texto adicional.
  `;

  try {
    // Preparar los mensajes para OpenAI
    const messages = [
      { role: 'system', content: 'Eres un asistente experto en investigación académica.' },
      { role: 'user', content: prompt }
    ];

    // Llamar al servicio de OpenAI
    let generatedText = await callOpenAI(messages);
    generatedText = generatedText.trim();

    // Intentar parsear la respuesta como JSON
    let parsedOutput;
    try {
      parsedOutput = JSON.parse(generatedText);
    } catch (err) {
      // Si falla el parseo, separar la respuesta por líneas y filtrar las vacías
      parsedOutput = { questions: generatedText.split('\n').filter(line => line.trim() !== '') };
    }

    res.status(200).json(parsedOutput);
  } catch (error) {
    console.error('Error al llamar a OpenAI:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud con OpenAI' });
  }
}

module.exports = { generateResearchQuestions };
