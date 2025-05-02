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

  console.log('studies_data:', studies_data);
  console.log('extraction_data:', extraction_data);

  // Totales
  const total = studies_data.length;
  const aceptados = studies_data.filter(s => s.status === 'Aceptado').length;
  const rechazados = studies_data.filter(s => s.status === 'Rechazado').length;
  const duplicados = studies_data.filter(s => s.status === 'Duplicado').length;

  const porcentajeAceptados = ((aceptados / total) * 100).toFixed(1);
  const porcentajeRechazados = ((rechazados / total) * 100).toFixed(1);
  const porcentajeDuplicados = ((duplicados / total) * 100).toFixed(1);

  // Preguntas únicas (en orden de aparición)
  const preguntas = Array.from(new Set(extraction_data.map(r => r.pregunta)));

  // Referencias APA de artículos aceptados (únicas por id_estudios)
  const acceptedResponses = extraction_data.filter(r =>
    studies_data.find(s => s.id_estudios === r.id_estudios && s.status === 'aceptado')
  );
  const uniqueAccepted = uniqueBy(acceptedResponses, r => r.id_estudios);
  const referenciasAPA = uniqueAccepted.map(r => {
    const authorsAPA = r.autores.split(' and ').join(' & ');
    return `${authorsAPA} (${r.anio}). ${r.titulo}. ${r.revista}. https://doi.org/${r.doi}`;
  });

  // Construcción de bloques por pregunta
  const bloquesPreguntas = preguntas.map(q => {
    const respuestas = extraction_data
      .filter(r =>
        r.pregunta === q &&
        studies_data.find(s => s.id_estudios === r.id_estudios && s.status === 'aceptado')
      )
      .map(r => {
        const authorsAPA = r.autores.split(' and ').join(' & ');
        // Cada párrafo: cita autores, análisis de la respuesta
        return `"Para el artículo de ${authorsAPA} (${r.anio}), titulado \\"${r.titulo}\\", escribe un párrafo de 2–3 oraciones (600–900 caracteres) en tono académico-formal: primero explica brevemente el enfoque del artículo y luego analiza esta respuesta extraída: \\"${r.respuesta.replace(/"/g, '\\"')}\\"."`;
      });
    return `  "${q}": [\n    ${respuestas.join(',\n    ')}\n  ]`;
  }).join(',\n');

  const prompt = `
Usa **solo** estos datos (no inventes nada) para generar **exactamente** este JSON:

{
  "reflexion_inicial": [
    "<Párrafo 1 (2 oraciones). Resume la magnitud de la muestra: De un total de ${total} estudios, ${aceptados} fueron aceptados (${porcentajeAceptados} %), ${rechazados} rechazados (${porcentajeRechazados} %) y ${duplicados} duplicados (${porcentajeDuplicados} %). Concluye subrayando que el número de aceptados define la base de evidencia analizada.>",
    "<Párrafo 2 (2–3 oraciones). Explica el propósito de la sección de resultados: presentar los hallazgos sintéticos para cada pregunta de investigación, destacando patrones comunes y discrepancias entre los artículos aceptados. Cierra afirmando que el análisis busca aportar claridad sobre la efectividad sobre el tema de investigación.>"
    "<Párrafo 3 (1–2 oraciones). Señala que las subsecciones siguientes presentan el análisis detallado de los artículos aceptados, estructurado en torno a cada pregunta de investigación específica.>"
  ],
  
${bloquesPreguntas},

  "referencias": [
    ${referenciasAPA.map(ref => `"${ref.replace(/"/g, '\\"')}"`).join(',\n    ')}
  ]
}

— **Instrucciones**:
1. **reflexion_inicial**:
  -Quita los signos “\< … >” de los párrafos finales (sólo se usan como marcador en este prompt).
  - Devuelve los 3 párrafos en un único string, separados por **doble salto de línea** (usa “\\n\\n”).
2. Para cada pregunta (clave):
   - Genera un array de párrafos, uno por estudio aceptado.
   - Cada párrafo debe tener **2–3 oraciones** y **600–900 caracteres**. que no tenga errores gramaticales ni de puntuación.
   - Cita autores en formato APA (p.ej. Figueiredo & García-Peñalvo (2020)).
   - Primero describe el enfoque del artículo en 1 oración, luego analiza la "respuesta" en otra oracion o mas oraciones.
   - **No** inventes nada que no esté en los datos.
3. **referencias**: lista APA de todos los artículos aceptados (autor, año, título, revista, DOI).
4. Devuelve únicamente JSON válido, sin texto fuera del JSON.
5. Puedes usar hasta **16000 tokens**.
`;

  try {
    const messages = [
      { role: 'system', content: 'Eres un asistente experto en redacción académica y análisis de resultados de revisiones sistemáticas.' },
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
