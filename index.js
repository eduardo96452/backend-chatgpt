require('dotenv').config(); // Carga variables de entorno de .env
const express = require('express');
const cors = require('cors');
const { Configuration, OpenAIApi } = require('openai');

const app = express();
app.use(cors());
app.use(express.json()); // Para parsear JSON en requests

// Configurar OpenAI con la clave del .env
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Endpoint de prueba (opcional)
app.get('/', (req, res) => {
  res.send('Bienvenido a la API segura de ChatGPT');
});

// Endpoint para generar la sugerencia
app.post('/api/generate-objective', async (req, res) => {
  try {
    const { title, methodology, description } = req.body;

    // Construye el prompt de la manera que necesites
    const prompt = `
      Eres un asistente experto en investigación.
      Aquí tienes algunos datos:
      Título: ${title}
      Metodología: ${methodology}
      Descripción: ${description}
      Genera un objetivo detallado y profesional para esta reseña.
    `;

    // Llamada a la API de OpenAI
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Eres un asistente experto en investigación académica.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
    });

    // Extraer el contenido de la respuesta
    const suggestion = response.data.choices[0].message.content.trim();

    // Responder al frontend con la sugerencia
    return res.json({ suggestion });
  } catch (error) {
    console.error('Error al generar la sugerencia:', error);
    res.status(500).json({ error: 'Error al generar la sugerencia.' });
  }
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
