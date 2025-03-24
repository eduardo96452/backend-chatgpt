// controllers/referenciasController.js
const { callOpenAI } = require('../services/openaiService');

async function generateReferencias(req, res) {
  const {
    introduction,
    trabajos_relacionados,
    metodologia,
    resultados,
    format
  } = req.body;

  // Establecer un formato por defecto "IEEE" si no se envía nada
  const chosenFormat = format || 'IEEE';

  // Validar campos obligatorios
  if (!introduction && !trabajos_relacionados && !metodologia && !resultados) {
    return res.status(400).json({
      error: 'Falta el contenido mínimo en la solicitud (introducción, trabajos_relacionados, metodologia, resultados, etc.)'
    });
  }

  // Construimos un texto que combine dichas secciones
  const combinedText = `
[Introducción]\n${introduction || 'Sin introducción.'}

[Trabajos Relacionados]\n${trabajos_relacionados || 'Sin trabajos relacionados.'}

[Metodología]\n${metodologia || 'Sin metodología.'}

[Resultados]\n${resultados || 'Sin resultados.'}
  `;

  // Prompt para OpenAI
  const prompt = `
Eres un asistente experto en la generación de referencias bibliográficas verdaderas.
Basándote en el siguiente contenido (introducción, trabajos relacionados, metodología y resultados):
${combinedText}

Busca y genera un listado de referencias bibliográficas con artículos REALES, 
relevantes y actuales para sustentar las ideas que aparecen en el texto.
Debes usar el formato ${chosenFormat}, y ordenarlas alfabéticamente.
Asegúrate de que cada referencia sea legítima, incluyendo todos los campos requeridos 
por el estilo ${chosenFormat} (autores, título, revista o editorial, año, etc.).
Si no tienes suficiente información para generar una referencia concreta, 
crea referencias aproximadas pero verosímiles.
  `;

  try {
    const messages = [
      {
        role: 'system',
        content:
          'Eres un asistente experto en redacción y formato de referencias bibliográficas. ' +
          'Tu tarea es crear referencias reales en el formato solicitado.'
      },
      { role: 'user', content: prompt }
    ];

    let generatedText = await callOpenAI(messages);
    generatedText = generatedText.trim();

    res.status(200).json({ referencias: generatedText });
  } catch (error) {
    console.error('Error al llamar a OpenAI:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud con OpenAI' });
  }
}

module.exports = { generateReferencias };

