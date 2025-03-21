// controllers/conclusionController.js
const { callOpenAI } = require('../services/openaiService');

async function generateConclusion(req, res) {
  const { summary_results, future_research } = req.body;

  if (!summary_results || !future_research) {
    return res.status(400).json({ error: 'Faltan datos obligatorios en la solicitud (summary_results, future_research)' });
  }

  // Construir el prompt para OpenAI
  const prompt = `
Utilizando la siguiente información, genera un borrador de la sección de Conclusión para un artículo científico:
- Resumen de hallazgos: ${summary_results}
- Recomendaciones para futuras investigaciones: ${future_research}

Redacta un texto conciso y claro que resuma los aportes del estudio y sugiera futuras líneas de investigación, en un tono académico.
  `;

  try {
    const messages = [
      { role: 'system', content: 'Eres un asistente experto en redacción académica.' },
      { role: 'user', content: prompt }
    ];

    let generatedText = await callOpenAI(messages, 'gpt-4', 0.7);
    generatedText = generatedText.trim();

    res.status(200).json({ conclusion: generatedText });
  } catch (error) {
    console.error('Error al llamar a OpenAI:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud con OpenAI' });
  }
}

module.exports = { generateConclusion };
