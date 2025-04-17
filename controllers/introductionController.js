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
Genera un borrador de la sección de introducción de un artículo científico utilizando la información proporcionada.

— Título de la revisión: ${title}
— Descripción: ${description}
— Objetivo: ${objective}
— Área de Conocimiento: ${area_conocimiento || 'No especificado'}
— Tipo de Investigación: ${tipo_investigacion || 'No especificado'}

Requisitos:

1. Redacta en tono académico‑formal.
2. Presenta con claridad el contexto, la motivación y la relevancia del estudio.
3. **No** incluyas ningún encabezado como “Introducción” o similares.
4. Emplea párrafos cohesionados; evita listas y viñetas.
5. Finaliza con un párrafo que organice el resto del manuscrito exactamente así (puedes ajustar sólo los verbos a tiempo pasado, pero respeta la estructura y los números de sección):

   “Este documento se organizó de la siguiente manera: en la sección 2 se abordó los trabajos relacionados, en la sección 3 se presentó la metodología, en la sección 4 se establecieron los resultados, en la sección 5 se desarrolló la discusión, en la sección 6 se describieron las limitaciones y en la sección 7 se detallaron las conclusiones.”
`;


  try {
    // Preparar mensajes para OpenAI
    const messages = [
      { role: 'system', content: 'Eres un asistente experto en redacción académica.' },
      { role: 'user', content: prompt }
    ];

    // Llamar al servicio centralizado
    let generatedText = await callOpenAI(messages);
    generatedText = generatedText.trim();

    res.status(200).json({ introduction: generatedText });
  } catch (error) {
    console.error('Error al llamar a OpenAI:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud con OpenAI' });
  }
}

module.exports = { generateIntroduction };
