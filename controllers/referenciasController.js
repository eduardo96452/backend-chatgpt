// controllers/referenciasController.js
const { callOpenAI } = require('../services/openaiService');

async function generateReferencias(req, res) {
  const { citations_list, format } = req.body; // 'format' puede ser APA, IEEE, etc.

  if (!citations_list || !format) {
    return res.status(400).json({ error: 'Faltan datos obligatorios en la solicitud (citations_list, format)' });
  }

  const prompt = `
Utilizando la siguiente lista de citas: ${citations_list},
genera una lista de referencias bibliográficas en formato ${format} para un artículo científico.
Asegúrate de que el formato sea correcto y que cada referencia esté ordenada alfabéticamente.
  `;

  try {
    const messages = [
      { role: 'system', content: 'Eres un asistente experto en redacción y formato de referencias bibliográficas.' },
      { role: 'user', content: prompt }
    ];

    let generatedText = await callOpenAI(messages);
    generatedText = generatedText.trim();

    res.status(200).json({ referencias: generatedText });
  } catch (error) {
    console.error('Error al llamar a OpenAI:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud con OpenAI' });
  }
}

module.exports = { generateReferencias };
