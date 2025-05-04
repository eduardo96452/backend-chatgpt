// controllers/resumenController.js

const { callOpenAI } = require('../services/openaiService');

async function generateResumen(req, res) {
  const {
    title,
    objective,
    methodology,
    results_summary,
    discussion_summary,
    conclusions,
    word_count
  } = req.body;

  if (
    !title ||
    !objective ||
    !methodology ||
    !results_summary ||
    !discussion_summary ||
    !conclusions ||
    !word_count
  ) {
    return res.status(400).json({
      error:
        'Faltan campos obligatorios en la solicitud (title, objective, methodology, results_summary, discussion_summary, conclusions, word_count)'
    });
  }

  const prompt = `
Genera en español un Resumen (abstract) académico de exactamente ${word_count} palabras
a partir de la siguiente información:

Título:
${title}

Objetivo:
${objective}

Metodología:
${JSON.stringify(methodology)}

Resumen de resultados:
${JSON.stringify(results_summary)}

Resumen de discusión:
${JSON.stringify(discussion_summary)}

Conclusiones:
${conclusions}

Instrucciones:
- Redacta un único párrafo fluido y académico.
- No añadas secciones ni encabezados, sólo el texto.
- Devuelve estrictamente este JSON:
{
  "resumen": "…texto generado…"
}
`;

  try {
    const messages = [
      {
        role: 'system',
        content:
          'Eres un asistente experto en redacción académica de abstracts para artículos científicos.'
      },
      { role: 'user', content: prompt }
    ];

    let aiRaw = await callOpenAI(messages, 'gpt-4o-mini', 0.3, 4000);

    aiRaw = aiRaw.replace(/^```json|```$/g, '').trim();
    const parsed = JSON.parse(aiRaw);
    return res.json(parsed);
  } catch (err) {
    console.error('Error generando resumen:', err);
    return res
      .status(500)
      .json({ error: 'Error al procesar la solicitud con OpenAI' });
  }
}

module.exports = { generateResumen };
