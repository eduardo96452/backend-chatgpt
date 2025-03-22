// controllers/criteriaController.js
const { callOpenAI } = require('../services/openaiService');

// Función para limpiar la respuesta de posibles delimitadores Markdown
function cleanResponse(response) {
  return response
    .replace(/^```(json)?\n/, '')
    .replace(/\n```$/, '')
    .trim();
}

async function generateCriteria(req, res) {
  const { title, objective } = req.body;

  if (!title || !objective) {
    return res.status(400).json({ error: 'Debe proporcionar título y objetivo del estudio.' });
  }

  // Construir el prompt para OpenAI
  const prompt = `
      Eres un experto en revisiones sistemáticas de literatura.
      Basado en el siguiente estudio:
      - Título: ${title}
      - Objetivo: ${objective}

      Genera una tabla con criterios de inclusión y exclusión.
      La respuesta debe estar estructurada solo en JSON, con este formato:

      [
        { "criterio": "Texto del criterio 1", "categoria": "incluido" },
        { "criterio": "Texto del criterio 2", "categoria": "excluido" }
      ]

      - No uses listas ni explicaciones adicionales, solo el JSON solicitado.
      - Usa lenguaje académico, pero claro y directo.
  `;

  try {
    // Preparar los mensajes para la llamada a OpenAI
    const messages = [
      { role: 'system', content: 'Eres un asistente experto en metodología científica.' },
      { role: 'user', content: prompt }
    ];

    // Llamar al servicio OpenAI
    let generatedText = await callOpenAI(messages);
    generatedText = generatedText.trim();

    // Intentar parsear la respuesta como JSON
    let parsedCriteria;
    try {
      parsedCriteria = JSON.parse(generatedText);
    } catch (err) {
      console.error('Error al parsear JSON:', err);
      return res.status(500).json({ error: 'La respuesta no es un JSON válido' });
    }

    res.status(200).json(parsedCriteria);
  } catch (error) {
    console.error('Error al generar criterios:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud.' });
  }
}

module.exports = { generateCriteria };
