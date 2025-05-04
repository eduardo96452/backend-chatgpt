// controllers/conclusionController.js
const { callOpenAI } = require('../services/openaiService');

async function generateConclusion(req, res) {
  const {
    results_summary,
    discussion_summary,
    objective,
    research_questions
  } = req.body;

  // Validación de campos obligatorios
  if (
    !results_summary ||
    !discussion_summary ||
    !objective ||
    !Array.isArray(research_questions) ||
    research_questions.length === 0
  ) {
    return res.status(400).json({
      error:
        'Faltan datos obligatorios en la solicitud (results_summary, discussion_summary, objective, research_questions)'
    });
  }

  // Construimos el prompt con todo el contexto
  const prompt = `
Eres un asistente de redacción académica. Genera la sección de Conclusiones de un artículo de revisión sistemática de literatura usando estos datos:

• Objetivo de la revisión:
${objective}

• Resumen de resultados (reflexión inicial, preguntas y referencias):
${JSON.stringify(results_summary, null, 2)}

• Resumen de la discusión:
${discussion_summary.join('\n\n')}

• Preguntas de investigación:
${research_questions.map((q) => `- ${q}`).join('\n')}

Instrucciones:
1. Redacta un texto académico-formal, claro y conciso.
2. Empieza contestando directamente la(s) pregunta(s) de investigación.
3. Integra los hallazgos resumidos y cómo apoyan o matizan el objetivo.
4. Propón al final 2–3 sugerencias para futuras líneas de investigación.
5. Devuelve únicamente un JSON con la clave "conclusiones" cuyo valor sea el párrafo completo.

JSON de salida esperado:
{
  "conclusiones": "<Tu texto aquí, con 2–3 párrafos separados por \\n\\n>"
}
`;

  try {
    const messages = [
      { role: 'system', content: 'Eres un asistente experto en redacción académica.' },
      { role: 'user', content: prompt }
    ];

    // Llamada a OpenAI con gpt-4o-mini, temp 0.3, maxTokens 16000
    let aiRaw = await callOpenAI(messages, 'gpt-4o-mini', 0.3, 16000);
    aiRaw = aiRaw.replace(/^```json|```$/g, '').trim();
    const parsed = JSON.parse(aiRaw);

    // Retornamos solo las conclusiones
    return res.status(200).json({ conclusiones: parsed.conclusiones });
  } catch (err) {
    console.error('Error al generar conclusiones:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Error interno al procesar conclusiones con OpenAI' });
  }
}

module.exports = { generateConclusion };
