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

// Ruta para manejar solicitudes para el objetivo.....................
app.post('/api/generate-objetive', async (req, res) => {
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
        temperature: 1.0
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

// Ruta para manejar solicitudes para la metodología de estructura
app.post('/api/methodology-structure', async (req, res) => {
  const { methodology, title, objective } = req.body;

  if (!methodology || !title || !objective) {
    return res.status(400).json({ error: 'Faltan datos en la solicitud' });
  }

  const methodologies = {
    PICO: { picoP: "Población", picoI: "Intervención", picoC: "Comparación", picoO: "Outcome" },
    PICOC: { picocP: "Población", picocI: "Intervención", picocC: "Comparación", picocO: "Outcome", picocContext: "Contexto" },
    PICOTT: { picottP: "Población", picottI: "Intervención", picottC: "Comparación", picottO: "Outcome", picottT: "Tipo de pregunta", picottT2: "Tipo de estudio" },
    SPICE: { spiceS: "Setting", spiceP: "Población", spiceI: "Intervención", spiceC: "Comparación", spiceE: "Evaluación" }
  };

  if (!methodologies[methodology.toUpperCase()]) {
    return res.status(400).json({ error: 'Metodología no reconocida' });
  }

  const prompt = `
Eres un asistente experto en metodología de investigación. 
Con base en la metodología "${methodology}", el título "${title}" y el objetivo "${objective}", 
devuelve exclusivamente la estructura aplicada en formato JSON.

Ejemplos de salida:
{
  "picoP": "Pacientes con diagnósticos convencionales",
  "picoI": "Aplicación de modelos de aprendizaje profundo",
  "picoC": "Resultados obtenidos con métodos tradicionales",
  "picoO": "Medir la efectividad y precisión de la IA en el diagnóstico"
}
o
{
  "picocP": "Estudiantes de educación secundaria",
  "picocI": "Uso de plataformas de gamificación en el aula",
  "picocC": "Métodos de enseñanza tradicionales",
  "picocO": "Evaluar la mejora en la motivación y rendimiento académico",
  "picocContext": "Entornos educativos urbanos con acceso a tecnología"
}
o
{
  "picottP": "Empleados de empresas tecnológicas",
  "picottI": "Implementación del teletrabajo",
  "picottC": "Trabajo presencial en oficinas",
  "picottO": "Evaluar cambios en productividad y satisfacción laboral",
  "picottT": "Pregunta organizacional",
  "picottT2": "Estudio comparativo transversal"
}
o
{
  "spiceS": "Entornos digitales y redes sociales",
  "spiceP": "Ciudadanos comprometidos con la política local",
  "spiceI": "Uso de plataformas digitales para participación ciudadana",
  "spiceC": "Participación tradicional en reuniones públicas",
  "spiceE": "Medir el nivel de implicación y satisfacción con la participación"
}

No incluyas explicaciones ni texto adicional. Solo devuelve el JSON con los valores desarrollados.
`;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 1.0
      },
      {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
      }
    );

    const structuredResponse = response.data.choices[0].message.content.trim();

    // Intenta parsear el resultado como JSON
    let parsedData;
    try {
      parsedData = JSON.parse(structuredResponse);
    } catch (error) {
      console.error('Error al parsear JSON:', error);
      return res.status(500).json({ error: 'La respuesta no es un JSON válido' });
    }

    res.status(200).json(parsedData);
  } catch (error) {
    console.error('Error al llamar a OpenAI:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud con OpenAI' });
  }
});

// Ruta para generar preguntas de investigación
app.post('/api/research-questions', async (req, res) => {
  const { title, objective, methodology } = req.body;

  if (!title || !objective || !methodology) {
    return res.status(400).json({ error: 'Faltan datos en la solicitud' });
  }

  try {
    // Genera el prompt para OpenAI
    const prompt = `
    Eres un experto en metodología de investigación. Genera entre 1 y 5 preguntas de investigación para una Revisión Sistemática de Literatura.

    - **Título:** ${title}
    - **Objetivo:** ${objective}
    - **Metodología:** ${methodology}

    **Instrucciones:**
    - Usa un tono académico.
    - Asegúrate de que sean preguntas abiertas y relevantes para la metodología utilizada.
    - No agregues texto adicional, responde solo con las preguntas enumeradas.

    Ejemplo de salida:
    1. ¿Cómo ha evolucionado el uso de la inteligencia artificial en la detección de enfermedades?
    2. ¿Qué impacto tienen los modelos de aprendizaje profundo en la precisión del diagnóstico médico?
    `;

    // Llamada a OpenAI
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Eres un asistente experto en metodología de investigación.' },
          { role: 'user', content: prompt }
        ],
        temperature: 1.0
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );

    // Extraer las preguntas generadas
    const generatedQuestions = response.data.choices[0].message.content.trim().split('\n');

    // Enviar respuesta
    res.status(200).json({ research_questions: generatedQuestions });
  } catch (error) {
    console.error('Error al generar preguntas:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud con OpenAI' });
  }
});

// Ruta para generar palabras clave y sinónimos
app.post('/api/generate-keywords', async (req, res) => {
  const { methodologyData } = req.body;

  if (!methodologyData || typeof methodologyData !== 'object') {
    return res.status(400).json({ error: 'Debe proporcionar un objeto con la metodología' });
  }

  try {
    // Construcción del prompt para OpenAI
    const prompt = `
      Eres un experto en terminología científica. Extrae palabras clave de la siguiente metodología y proporciona sinónimos relevantes.

      Metodología:
      ${JSON.stringify(methodologyData, null, 2)}

      **Instrucciones:**
      - Extrae palabras clave significativas de cada sección.
      - Para cada palabra clave, genera de entre 2 a 5 sinónimos relacionados.
      - La respuesta debe estar en formato de tabla JSON con los siguientes campos:
        - "palabra_clave"
        - "metodologia"
        - "sinonimos" (array con máximo 3 elementos)
      
      **Ejemplo de salida:**
      [
        { "palabra_clave": "inteligencia artificial", "metodologia": "Intervención", "sinonimos": ["aprendizaje automático", "redes neuronales", "deep learning"] },
        { "palabra_clave": "diagnóstico", "metodologia": "Comparación", "sinonimos": ["detección", "evaluación", "análisis clínico"] }
      ]
      
      **No incluyas ninguna otra explicación o texto adicional.**
    `;

    // Llamada a OpenAI
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Eres un asistente experto en terminología científica y metodología de investigación.' },
          { role: 'user', content: prompt }
        ],
        temperature: 1.0
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );

    // Extraer la respuesta generada (en formato JSON)
    const generatedKeywords = JSON.parse(response.data.choices[0].message.content.trim());

    // Enviar respuesta
    res.status(200).json({ keywords: generatedKeywords });
  } catch (error) {
    console.error('Error al generar palabras clave:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud con OpenAI' });
  }
});

// Ruta para generar cadenas de búsqueda
app.post('/api/generate-search-string', async (req, res) => {
  const { keywords } = req.body;

  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ error: 'Debe proporcionar una lista de palabras clave con sinónimos.' });
  }

  try {
    // Construcción de la cadena de búsqueda
    const searchString = keywords
      .map(({ palabra_clave, sinonimos }) => {
        const allTerms = [palabra_clave, ...sinonimos].map(term => `"${term}"`).join(" OR ");
        return `(${allTerms})`;
      })
      .join(" AND ");

    // Enviar respuesta
    res.status(200).json({ searchString });
  } catch (error) {
    console.error('Error al generar cadena de búsqueda:', error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud.' });
  }
});

// Ruta para generar criterios de inclusion y exclusion
app.post('/api/generate-criteria', async (req, res) => {
  const { title, objective } = req.body;

  if (!title || !objective) {
    return res.status(400).json({ error: 'Debe proporcionar título y objetivo del estudio.' });
  }

  try {
    // Construcción del prompt para OpenAI
    const prompt = `
      Eres un experto en revisiones sistemáticas de literatura.
      Basado en el siguiente estudio:
      - Título: ${title}
      - Objetivo: ${objective}

      Genera una tabla con criterios de inclusión y exclusión.
      La respuesta debe estar estructurada solo en JSON, con este formato:

      [
        { "criterio": "Texto del criterio 1", "categoria": "incluido" },
        { "criterio": "Texto del criterio 2", "categoria": "excluido" }
      ]

      - No uses listas ni explicaciones adicionales, solo el JSON solicitado.
      - Usa lenguaje académico, pero claro y directo.
    `;

    // Llamada a OpenAI para generar la respuesta
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Eres un asistente experto en metodología científica.' },
          { role: 'user', content: prompt }
        ],
        temperature: 1.0
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );

    // Extraer la respuesta generada
    const generatedCriteria = JSON.parse(response.data.choices[0].message.content.trim());

    // Enviar la respuesta al cliente
    res.status(200).json(generatedCriteria);
  } catch (error) {
    console.error('Error al generar criterios:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud.' });
  }
});


// Inicia el servidor en localhost:3000
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
