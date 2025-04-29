// services/openaiService.js
const axios = require('axios');

async function callOpenAI(
  messages,
  model = 'gpt-4-turbo',    // o el que prefieras
  temperature = 0.3,
  max_tokens = 1000         // añade este parámetro
) {
  try {
    const body = {
      model,
      messages,
      temperature,
      max_tokens               // lo incluimos en la petición
    };

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      body,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error al llamar a OpenAI:', error.response?.data || error.message);
    throw new Error('Error al procesar la solicitud con OpenAI');
  }
}

module.exports = { callOpenAI };
