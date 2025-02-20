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
  const { title, objective, methodology, numQuestions } = req.body;

  if (!title || !objective || !methodology) {
    return res.status(400).json({ error: 'Faltan datos en la solicitud' });
  }

  // Si no se especifica numQuestions, por defecto se generan 3 preguntas.
  const questionsCount = numQuestions && Number(numQuestions) > 0 ? Number(numQuestions) : 3;

  // Construir el prompt para OpenAI
  const prompt = `
Eres un asistente experto en investigación académica. 
Con base en la metodología "${methodology}", el título "${title}" y el objetivo "${objective}", 
genera ${questionsCount} preguntas de investigación en formato JSON. 
Ejemplo de salida:
{
  "questions": [
    "¿Cómo ha evolucionado el uso de la inteligencia artificial en la detección de enfermedades?",
    "¿Qué impacto tienen los modelos de aprendizaje profundo en la precisión del diagnóstico médico?",
    "Pregunta 3..."
  ]
}
Devuelve únicamente el JSON sin ningún texto adicional.
  `;
  try {
    // Llamada a OpenAI
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
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

    // Se extrae el contenido y se intenta parsear como JSON
    const generatedText = response.data.choices[0].message.content.trim();
    let parsedOutput;
    try {
      parsedOutput = JSON.parse(generatedText);
    } catch (err) {
      // Si falla el parseo, se separa por líneas y se filtra
      parsedOutput = { questions: generatedText.split('\n').filter(line => line.trim() !== '') };
    }

    res.status(200).json(parsedOutput);
  } catch (error) {
    console.error('Error al llamar a OpenAI:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud con OpenAI' });
  }
});

// Ruta para generar palabras clave y sinónimos
app.post('/api/generate-keywords', async (req, res) => {
  const { methodologyData } = req.body;

  if (!methodologyData || typeof methodologyData !== 'object') {
    return res.status(400).json({ error: 'Debe proporcionar un objeto con la metodología' });
  }

  // Construir el prompt detallado
  const prompt = `
  Eres un experto en terminología científica y metodología de investigación. Dada la siguiente metodología en formato JSON, extrae palabras clave significativas de cada sección y asigna la etiqueta correspondiente según la siguiente convención:
  - Para SPICE, utiliza: "Escenario", "Perspectiva", "Intervención", "Comparación", "Evidencia".
  - Para PICO, utiliza: "Población", "Intervención", "Comparación", "Resultado".
  - Para PICOC, utiliza: "Población", "Intervención", "Comparación", "Resultado", "Contexto".
  - Para PICOTT, utiliza: "Población", "Intervención", "Comparación", "Resultado", "Tipo de pregunta", "Tipo de artículo".
  
  Para cada palabra clave extraída, genera un array de 2 a 5 sinónimos relevantes. Además, incluye en cada objeto un campo "siglas" que contenga un número de acuerdo a la siguiente numeración global:
  - Si la etiqueta asignada es para PICO:
    - "Población" → 1
    - "Intervención" → 2
    - "Comparación" → 3
    - "Resultado" → 4
  - Si la etiqueta asignada es para PICOC:
    - "Población" → 5
    - "Intervención" → 6
    - "Comparación" → 7
    - "Resultado" → 8
    - "Contexto" → 9
  - Si la etiqueta asignada es para PICOTT:
    - "Población" → 10
    - "Intervención" → 11
    - "Comparación" → 12
    - "Resultado" → 13
    - "Tipo de pregunta" → 14
    - "Tipo de artículo" → 15
  - Si la etiqueta asignada es para SPICE:
    - "Escenario" → 16
    - "Perspectiva" → 17
    - "Intervención" → 18
    - "Comparación" → 19
    - "Evidencia" → 20
  
  La respuesta debe estar estrictamente en formato JSON, como una lista de objetos, donde cada objeto tenga las siguientes propiedades:
    - "palabra_clave": la palabra clave extraída,
    - "metodologia": la etiqueta asignada (por ejemplo, "Población"),
    - "sinonimos": un array con 2 a 5 sinónimos,
    - "siglas": un número de acuerdo a la numeración global descrita.
  
  No incluyas ningún texto adicional ni explicaciones.
  
  Metodología:
  ${JSON.stringify(methodologyData, null, 2)}
  `;
  

  try {
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

    // Extraer y parsear la respuesta
    const generatedKeywords = JSON.parse(response.data.choices[0].message.content.trim());
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
