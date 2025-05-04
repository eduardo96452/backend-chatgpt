// controllers/objectivesController.js
// Opción A: uso directo de axios
const axios = require('axios');
const { callOpenAI } = require('../services/openaiService.js');

// Opción B: uso del servicio que creamos (descomenta esta línea y comenta la de axios)
// const { callOpenAI } = require('../services/openaiService.js');

async function generateObjective(req, res) {
  const {
    title,
    methodology,
    description,
    alcance,
    pais,
    ciudad,
    area_conocimiento,
    tipo_investigacion,
    institucion
  } = req.body;

  // Validamos campos obligatorios
  if (!title || !methodology || !description) {
    return res.status(400).json({
      error: 'Faltan datos obligatorios (title, methodology, description)'
    });
  }

  try {
    // Construimos una sección adicional con campos opcionales
    let optionalFields = '';
    if (alcance) optionalFields += `\n- Alcance: ${alcance}`;
    if (pais) optionalFields += `\n- País: ${pais}`;
    if (ciudad) optionalFields += `\n- Ciudad: ${ciudad}`;
    if (area_conocimiento) optionalFields += `\n- Área de Conocimiento: ${area_conocimiento}`;
    if (tipo_investigacion) optionalFields += `\n- Tipo de Investigación: ${tipo_investigacion}`;
    if (institucion) optionalFields += `\n- Institución: ${institucion}`;

    // Si hay datos opcionales, los agrupamos con un encabezado
    let extraSection = '';
    if (optionalFields.trim()) {
      extraSection = `\nInformación adicional:\n${optionalFields}`;
    }

    // Prompt para OpenAI
    const prompt = `
      1. Usa los siguientes datos para elaborar un objetivo en un solo enunciado de tono académico:
      - Título de la revisión: ${title}
      - Metodología de la revisión: ${methodology}
      - Descripción breve: ${description}${extraSection}

      2. El objetivo debe seguir la fórmula:
         (verbo en infinitivo) + (qué cosa) + (cómo) + (para qué)

      3. No excedas las 30 palabras en tu respuesta final.
      4. No uses enumeraciones, viñetas ni explicaciones adicionales; la frase debe ser fluida y concisa.
      5. Asegúrate de que el texto sea redactado en un estilo académico, sin incluir listas o puntos.
    `;
    
    const messages = [
      { role: 'system', content: 'Eres un asistente experto en investigación académica.' },
      { role: 'user', content: prompt }
    ];
    const generatedObjective = await callOpenAI(messages);
    res.status(200).json({ objective: generatedObjective });
    

  } catch (error) {
    console.error('Error al generar objetivo:', error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud con OpenAI' });
  }
}

module.exports = { generateObjective };
