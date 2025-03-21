// controllers/trabajosRelacionadosController.js
const { callOpenAI } = require('../services/openaiService');

async function generateTrabajosRelacionados(req, res) {
  const { title, keywords, criterios_seleccion, description } = req.body;

  if (!title || !keywords || !criterios_seleccion) {
    return res.status(400).json({ error: 'Faltan datos obligatorios en la solicitud (title, keywords, criterios_seleccion)' });
  }

  const prompt = `
Utilizando la siguiente información, genera un borrador de la sección de Trabajos Relacionados para un artículo científico:
- Título de la revisión: ${title}
- Palabras clave: ${keywords}
- Criterios de selección: ${criterios_seleccion}
- Descripción breve: ${description || 'No se proporcionó descripción adicional.'}

Resume y analiza los estudios previos relevantes, enfatizando cómo aportan al conocimiento sobre el tema.
  `;

  try {
    const messages = [
      { role: 'system', content: 'Eres un asistente experto en redacción académica.' },
      { role: 'user', content: prompt }
    ];

    // Llamada al servicio OpenAI con modelo gpt-4 y temperatura 0.7
    let generatedText = await callOpenAI(messages);
    generatedText = generatedText.trim();

    res.status(200).json({ trabajos_relacionados: generatedText });
  } catch (error) {
    console.error('Error al llamar a OpenAI:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud con OpenAI' });
  }
}

module.exports = { generateTrabajosRelacionados };
