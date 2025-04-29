// controllers/trabajosRelacionadosController.js
const { callOpenAI } = require('../services/openaiService');

async function generateTrabajosRelacionados(req, res) {
  const { title, keywords, criterios_seleccion, description } = req.body;
  if (!title || !keywords || !criterios_seleccion) {
    return res.status(400).json({ error: 'Faltan datos obligatorios (title, keywords, criterios_seleccion).' });
  }

  // Prompt reforzado para referencias reales
  const prompt = `
Genera **exactamente** este JSON, sin texto extra:

{
  "trabajos_relacionados": "<cuerpo en párrafos académicos>",
  "references": [
    "<APA 1>",
    "<APA 2>",
    // …
  ]
}

Reglas para "trabajos_relacionados":
• Longitud total 9000–10000 caracteres (incluyendo espacios).  
• Divide en párrafos de 2–3 oraciones cada uno.  
• Cada párrafo incluye al menos un marcador IEEE único y ascendente: [1], [2], …  
• Tono académico-formal, prosa continua (sin encabezados).  
• Puedes usar hasta **9000 tokens**.

Reglas para "references":
• Debes devolver **exactamente** una referencia en formato APA 7 por cada marcador IEEE.  
• **Usa SOLO referencias reales**: artículos publicados en revistas indexadas o conferencias reconocidas, con autor(es), año, título, revista y volúmen/páginas correctos.  
• Orden numérico: la primera referencia corresponde a [1], la segunda a [2], etc.

Datos para contextualizar:
Título: ${title}
Palabras clave: ${keywords}
Criterios de selección: ${criterios_seleccion}
Descripción breve: ${description || 'No proporcionada.'}
`;

  const messages = [
    { role: 'system', content: 'Eres un asistente experto en redacción académica y gestión de referencias.' },
    { role: 'user',   content: prompt }
  ];

  try {
    // Llamada con mayor tope de tokens
    let raw = await callOpenAI(messages, 'gpt-4o-mini', 0.3, 10000);
    raw = raw.trim();

    // Limpieza de fences Markdown
    if (raw.startsWith('```')) {
      const m = raw.match(/```(?:json)?\s*([\s\S]*?)```$/i);
      if (m) raw = m[1].trim();
    }

    // Intento de parseo
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error('Error parseando JSON de IA:', e);
      return res.json({ trabajos_relacionados: raw, references: [] });
    }

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
