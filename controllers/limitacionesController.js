// controllers/limitacionesController.js
const { callOpenAI } = require('../services/openaiService');

async function generateLimitaciones(req, res) {
  const { methodological_issues, search_limitations } = req.body;

  if (!methodological_issues || !search_limitations) {
    return res.status(400).json({
      error:
        'Faltan datos obligatorios en la solicitud (methodological_issues, search_limitations)'
    });
  }

  // Extraemos los campos de methodological_issues
  const {
    enfoque_metodologico,
    fases_prisma,
    procedimiento_busqueda,
    criterios_seleccion,
    proceso_cribado
  } = methodological_issues;

  // Extraemos los campos de search_limitations
  const reflexionInicialArr = search_limitations.reflexion_inicial || [];
  const preguntasObj = search_limitations.preguntas || {};
  const referenciasArr = search_limitations.referencias || [];

  // Construimos texto plano para incluir en el prompt
  const reflexionInicialText = reflexionInicialArr.join('\n\n');
  const preguntasEntries = Object.entries(preguntasObj)
    .map(
      ([preg, respuestas]) =>
        `- ${preg}:\n    • ${respuestas.join('\n    • ')}`
    )
    .join('\n\n');
  const referenciasText = referenciasArr.join('\n\n');

  const prompt = `
Con base en la siguiente información, redacta la sección de Limitaciones de un artículo científico:

1) Problemas metodológicos (RSL + PRISMA):
   • Enfoque metodológico: ${enfoque_metodologico}
   • Fases PRISMA: ${fases_prisma}
   • Procedimiento de búsqueda: ${procedimiento_busqueda}
   • Criterios de selección: ${criterios_seleccion}
   • Proceso de cribado: ${proceso_cribado}

2) Limitaciones derivadas de la revisión de resultados:
   • Reflexión inicial:\n${reflexionInicialText}

3) Limitaciones relacionadas con el detalle de preguntas:
${preguntasEntries}

4) Referencias de los estudios usados en resultados:\n${referenciasText}

Instrucciones:
- Describe de manera clara y concisa las principales limitaciones que afectan la interpretación de los hallazgos.
- Usa un tono académico-formal.
- Máximo 2 párrafos.
- No agregues nada que no esté aquí.
`;

  try {
    const messages = [
      { role: 'system', content: 'Eres un asistente experto en redacción académica.' },
      { role: 'user', content: prompt }
    ];

    // Reducimos max_tokens a 2048 (<=4096)
    let aiResponse = await callOpenAI(messages, 'gpt-4o-mini', 0.3, 2048);
    aiResponse = aiResponse.trim();

    return res.json({ limitaciones: aiResponse });
  } catch (error) {
    console.error('Error al llamar a OpenAI:', error.response?.data || error.message);
    return res
      .status(500)
      .json({ error: 'Error al procesar la solicitud de limitaciones con OpenAI.' });
  }
}

module.exports = { generateLimitaciones };
