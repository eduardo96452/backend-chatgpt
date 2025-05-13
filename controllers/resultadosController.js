// controllers/resultadosController.js
const { callOpenAI } = require('../services/openaiService');

// Helper para obtener únicos según clave
function uniqueBy(arr, keyFn) {
  const seen = new Set();
  return arr.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function generateResultados(req, res) {
  const { studies_data, extraction_data } = req.body;

  if (!Array.isArray(studies_data) || !Array.isArray(extraction_data)) {
    return res.status(400).json({
      error: 'Faltan datos obligatorios (studies_data, extraction_data).'
    });
  }

  // Totales basados en studies_data
  const total = studies_data.length;
  const aceptados = studies_data.filter(s => s.status.toLowerCase() === 'aceptado').length;
  const rechazados = studies_data.filter(s => s.status.toLowerCase() === 'rechazado').length;
  const duplicados = studies_data.filter(s => s.status.toLowerCase() === 'duplicado').length;

  const porcentajeAceptados = ((aceptados / total) * 100).toFixed(1);
  const porcentajeRechazados = ((rechazados / total) * 100).toFixed(1);
  const porcentajeDuplicados = ((duplicados / total) * 100).toFixed(1);

  // Definir preguntas únicas de extraction_data
  const preguntas = Array.from(new Set(extraction_data.map(r => r.pregunta)));

  // Datos explícitos para construir prompt sin inventos
  const reflexionInicial = 
    `De un total de ${total} estudios, ${aceptados} fueron aceptados (${porcentajeAceptados}%), ${rechazados} rechazados (${porcentajeRechazados}%) y ${duplicados} duplicados (${porcentajeDuplicados}%).\n\n` +
    `El propósito de esta sección es presentar los hallazgos sintéticos para cada pregunta de investigación, destacando patrones y discrepancias entre los artículos aceptados, para aportar claridad sobre la efectividad del tema investigado.\n\n` +
    `A continuación, se presenta un análisis detallado estructurado por cada pregunta específica.`;

  // Preparar bloques de preguntas y respuestas
  const bloquesPreguntas = preguntas.map((pregunta) => {
    const respuestas = extraction_data
      .filter(r => r.pregunta === pregunta)
      .map(r => ({
        autores: r.autores,
        anio: r.anio,
        titulo: r.titulo,
        revista: r.revista,
        doi: r.doi,
        respuesta: r.respuesta
      }));
    return { pregunta, respuestas };
  });

  // Formatear referencias enumeradas usando extraction_data único por título
  const uniqueExtractions = uniqueBy(extraction_data, r => r.titulo);
  const referencias = uniqueExtractions.map((r, idx) => {
    return `[${idx + 1}] ${r.autores} (${r.anio}). ${r.titulo}. ${r.revista}. https://doi.org/${r.doi}`;
  });

  // Construir prompt para OpenAI
  let prompt = `Usa **solo** estos datos para generar **exactamente** este JSON:
{
  "reflexion_inicial": "<texto>",
`;

  prompt += `  "reflexion_inicial": "${reflexionInicial.replace(/"/g, '\\"')}",
`;

  bloquesPreguntas.forEach((bloque, i) => {
    prompt += `  "${bloque.pregunta}": [
`;
    bloque.respuestas.forEach((r, j) => {
      const texto = 
        `Para el artículo de ${r.autores} (${r.anio}), escribe un párrafo de 4–5 oraciones en tono académico-formal: 
        primero describe brevemente el enfoque del artículo y luego presenta un detalle explicito con base en el siguiente texto: \"${r.respuesta.replace(/"/g, '\\"')}\".`;
      prompt += `    "${texto.replace(/"/g, '\\"')}"${j < bloque.respuestas.length - 1 ? ',' : ''}
`;
    });
    prompt += `  ]${i < bloquesPreguntas.length - 1 ? ',' : ''}
`;
  });

  prompt += `  ,
  "referencias": [
`;
  referencias.forEach((ref, i) => {
    prompt += `    "${ref.replace(/"/g, '\\"')}"${i < referencias.length - 1 ? ',' : ''}
`;
  });
  prompt += `  ]
}`;

  prompt += `

-- Instrucciones:
1. No inventes nada. Usa solo los datos aquí proporcionados.
2. Devuelve únicamente JSON válido.
3. "reflexion_inicial" debe estar sin < > y sin saltos de línea extras.
4. Cada pregunta debe generar un arreglo de párrafos (uno por respuesta de extracción), 4–5 oraciones.
5. Si los criterios de varios autores son similares, puedes unirlos en un solo párrafo de 5-10 oraciones.
6. Las referencias ya están enumeradas; no cambies el orden ni crees nuevas.
`;

  try {
    const messages = [
      { role: 'system', content: 'Eres un asistente experto en redacción académica que no inventa datos.' },
      { role: 'user', content: prompt }
    ];

    const aiRaw = await callOpenAI(messages, 'gpt-4o-mini', 0.3, 16000);
    const clean = aiRaw.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(clean);
    return res.json(result);
  } catch (err) {
    console.error('Error generando Resultados:', err);
    return res.status(500).json({ error: 'Error al procesar Resultados con OpenAI' });
  }
}

module.exports = { generateResultados };
