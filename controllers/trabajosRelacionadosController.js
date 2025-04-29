// controllers/trabajosRelacionadosController.js
const { callOpenAI } = require('../services/openaiService');

async function generateTrabajosRelacionados(req, res) {
  const { title, keywords, criterios_seleccion, description } = req.body;
  if (!title || !keywords || !criterios_seleccion) {
    return res.status(400).json({ error: 'Faltan datos obligatorios (title, keywords, criterios_seleccion).' });
  }

  // Construir el prompt para OpenAI
  const prompt = `
Genera **exactamente** este JSON, sin texto adicional:

{
  "trabajos_relacionados": "<cuerpo en párrafos académicos>",
  "references": [
    "<APA 1>",
    "<APA 2>",
    "<APA 3>",
    "<APA 4>"
  ]
}

Reglas para "trabajos_relacionados":
• Longitud total 7000–8000 caracteres (incluyendo espacios).  
• Párrafos de 2–3 oraciones cada uno.  
• Cada párrafo incluye al menos una cita IEEE única y ascendente: [1], [2], …  
• Tono académico-formal y cohesivo (sin encabezados ni viñetas).  
• Máximo 8000 tokens.

Reglas para "references":
• 4–6 referencias reales en formato APA 7, ordenadas alfabéticamente.

Datos:
Título: ${title}
Palabras clave: ${keywords}
Criterios de selección: ${criterios_seleccion}
Descripción breve: ${description || 'No proporcionada.'}
`;

  const messages = [
    { role: 'system', content: 'Eres un asistente experto en redacción académica.' },
    { role: 'user',   content: prompt }
  ];

  try {
    // Llamada a OpenAI con límite de tokens
    let raw = await callOpenAI(messages, 'gpt-4o-mini', 0.3, 8000);
    raw = raw.trim();

    // Eliminar fences Markdown ```...``` si las incluye
    if (raw.startsWith('```')) {
      const m = raw.match(/```(?:json)?\s*([\s\S]*?)```$/i);
      if (m) raw = m[1].trim();
    }

    // Intentar parsear JSON
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      // Si no es JSON válido, devolvemos el texto completo como cuerpo
      return res.json({ trabajos_relacionados: raw, references: [] });
    }

    // Responder con los dos campos
    return res.json({
      trabajos_relacionados: parsed.trabajos_relacionados,
      references           : parsed.references
    });

  } catch (err) {
    console.error('Error al llamar a OpenAI:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Error al procesar la solicitud con OpenAI.' });
  }
}

module.exports = { generateTrabajosRelacionados };
