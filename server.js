const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Ruta para manejar solicitudes a OpenAI
app.post('/api/chatgpt', async (req, res) => {
  const { title, methodology, description } = req.body;

  if (!title || !methodology || !description) {
    return res.status(400).json({ error: 'Faltan datos en la solicitud' });
  }

  try {
    // Construye el prompt para OpenAI
    const prompt = `      
      1. Usa los siguientes datos para elaborar un objetivo:
      - Título de la revisión: ${title}
      - Metodología de revisión: ${methodology}
      - Descripción breve: ${description}
      2. Escribe el objetivo usando la fórmula:
      (verbo en infinitivo) + (qué cosa) + (cómo) + (para qué)
      3. Tu respuesta debe resultar en una sola frase en tono académico.
      4. No incluyas enumeraciones ni viñetas; la frase final debe ser fluida y concisa.
    `;

    // Llama a la API de OpenAI
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4', // Cambia a 'gpt-4.77.3' si estás usando esa versión exacta
        messages: [
          { role: 'system', content: 'Eres un asistente experto en investigación académica.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );

    // Extrae la respuesta de OpenAI y envíala al cliente
    const generatedObjective = response.data.choices[0].message.content.trim();
    res.status(200).json({ objective: generatedObjective });
  } catch (error) {
    console.error('Error al llamar a OpenAI:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud con OpenAI' });
  }
});

// Inicia el servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
