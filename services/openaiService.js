// services/openaiService.js
const axios = require('axios');

async function callOpenAI(messages, model = 'gpt-4-turbo', temperature = 1.0) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        messages,
        temperature
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );

    // Devolvemos el contenido de la respuesta de OpenAI
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error al llamar a OpenAI:', error.response?.data || error.message);
    throw new Error('Error al procesar la solicitud con OpenAI');
  }
}

module.exports = { callOpenAI };
