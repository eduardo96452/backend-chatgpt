// controllers/trabajosRelacionadosController.js
const { callOpenAI } = require('../services/openaiService');

async function generateTrabajosRelacionados(req, res) {
  const { title, keywords, criterios_seleccion, description } = req.body;
  if (!title || !keywords || !criterios_seleccion) {
    return res.status(400).json({ error: 'Faltan datos obligatorios (title, keywords, criterios_seleccion).' });
  }

  // Construir el prompt para OpenAI
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
• Longitud total 6000 o 7000 caracteres (incluyendo espacios).  
• Divide en párrafos de 2 o 3 oraciones cada uno.  
• Cada párrafo incluye al menos un marcador IEEE único y ascendente: [1], [2], …  
• Tono académico-formal, prosa continua (sin encabezados).  
• Debes usar hasta **9000 tokens** para esta generación.  

Reglas para "references":
• Debes devolver una referencia APA 7 **por cada marcador IEEE** presente en el texto (si citaste hasta [15], devuelve 15 entradas reales).  
• Formato APA 7 realista y ordenadas numéricamente (la entrada 1 corresponde a [1], la 2 a [2], etc.).

Datos para contextualizar:
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
    // Llamada a OpenAI con límite de tokens elevado
    let raw = await callOpenAI(messages, 'gpt-4o-mini', 0.3, 10000);
    raw = raw.trim();

    // Quitar fences Markdown si los hubiera
    if (raw.startsWith('```')) {
      const m = raw.match(/```(?:json)?\s*([\s\S]*?)```$/i);
      if (m) raw = m[1].trim();
    }

    // Parseo
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error('Error parseando JSON de IA:', e);
      // Si falla, devolvemos el body completo y dejamos referencias vacío
      return res.json({ trabajos_relacionados: raw, references: [] });
    }

    // Responder
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