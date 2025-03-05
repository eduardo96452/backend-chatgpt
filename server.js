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

// Ruta para manejar solicitudes para el objetivo
app.post('/api/generate-objetive', async (req, res) => {
  const {
    title,
    methodology,
    description,
    alcance,
    pais,
    ciudad,
    area_conocimiento,
    tipo_investigacion,
    institucion
  } = req.body;

  if (!title || !methodology || !description) {
    return res.status(400).json({ error: 'Faltan datos obligatorios en la solicitud (title, methodology, description)' });
  }

  try {
    // Construimos una sección adicional con campos opcionales
    let optionalFields = '';
    if (alcance) {
      optionalFields += `\n- Alcance: ${alcance}`;
    }
    if (pais) {
      optionalFields += `\n- País: ${pais}`;
    }
    if (ciudad) {
      optionalFields += `\n- Ciudad: ${ciudad}`;
    }
    if (area_conocimiento) {
      optionalFields += `\n- Área de Conocimiento: ${area_conocimiento}`;
    }
    if (tipo_investigacion) {
      optionalFields += `\n- Tipo de Investigación: ${tipo_investigacion}`;
    }
    if (institucion) {
      optionalFields += `\n- Institución: ${institucion}`;
    }

    // Si hay datos opcionales, los agrupamos con un encabezado
    let extraSection = '';
    if (optionalFields.trim()) {
      extraSection = `\nInformación adicional:\n${optionalFields}`;
    }


    // Construye el prompt para OpenAI
    const prompt = `
    1. Usa los siguientes datos para elaborar un objetivo en un solo enunciado de tono académico:
    - Título de la revisión: ${title}
    - Metodología de revisión: ${methodology}
    - Descripción breve: ${description}${extraSection}

    2. El objetivo debe seguir la fórmula:
      (verbo en infinitivo) + (qué cosa) + (cómo) + (para qué)

    3. No excedas las 30 palabras en tu respuesta final.

    4. No uses enumeraciones, viñetas ni explicaciones adicionales; la frase debe ser fluida y concisa.

    5. Asegúrate de que el texto sea redactado en un estilo académico, sin incluir listas o puntos.
    `;

    // Llama a la API de OpenAI
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-turbo', // Ajusta si usas otra versión
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
        model: 'gpt-4-turbo',
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
  const { title, objective, methodology, numQuestions, tipoInvestigacion } = req.body;

  // Verificar que existan los campos obligatorios
  if (!title || !objective || !methodology) {
    return res.status(400).json({ error: 'Faltan datos en la solicitud (title, objective, methodology)' });
  }

  // Si no se especifica numQuestions o no es válido, por defecto se generan 3 preguntas
  const questionsCount = numQuestions && Number(numQuestions) > 0 ? Number(numQuestions) : 3;

  // Construir una sección opcional para "tipoInvestigacion"
  let investigationPart = '';
  if (tipoInvestigacion && tipoInvestigacion.trim()) {
    investigationPart = `y considerando que la investigación es de tipo "${tipoInvestigacion.trim()}" `;
  }

  // Construir el prompt para OpenAI
  const prompt = `
  Eres un asistente experto en investigación académica. 
  Con base en la metodología "${methodology}", el título "${title}" y el objetivo "${objective}" ${investigationPart}
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
        model: 'gpt-4-turbo',
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
        model: 'gpt-4-turbo',
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
  const { keywords, base, idioma } = req.body;

  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ error: 'Debe proporcionar una lista de palabras clave con sinónimos.' });
  }
  if (!base) {
    return res.status(400).json({ error: 'Debe proporcionar la base de datos.' });
  }
  if (!idioma) {
    return res.status(400).json({ error: 'Debe proporcionar el idioma.' });
  }

  try {
    // Construir una representación de las keywords:
    // Cada objeto se transforma en una cadena con términos entre comillas, combinados con OR.
    const keywordsString = keywords
      .map(({ palabra_clave, sinonimos }) => {
        const allTerms = [palabra_clave, ...sinonimos]
          .filter(term => term && term.trim() !== '')
          .map(term => `"${term.trim()}"`)
          .join(" OR ");
        return `(${allTerms})`;
      })
      .join(" AND ");

    // Construir el prompt para GPT-4
    const prompt = `
Utilizando la siguiente información, genera una cadena de búsqueda avanzada en formato booleano:
- Palabras clave y sinónimos: ${keywordsString}
- Base de datos: ${base}
- Idioma: ${idioma}

La cadena de búsqueda debe estar formulada con cada término entre comillas, usar "OR" para combinar sinónimos y "AND" para combinar grupos de términos. Proporciona únicamente la cadena final sin explicaciones adicionales.
`;

    // Llamada a la API de OpenAI
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: 'Eres un asistente experto en la generación de cadenas de búsqueda académicas.' },
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

    const generatedSearchString = response.data.choices[0].message.content.trim();
    res.status(200).json({ searchString: generatedSearchString });
  } catch (error) {
    console.error('Error al generar cadena de búsqueda:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud con OpenAI' });
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
        model: 'gpt-4-turbo',
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

// Ruta para generar preguntas de extracción de datos con tipo de respuesta
app.post('/api/generate-data-extraction-questions', async (req, res) => {
  const { title, objective, numberOfQuestions } = req.body;

  // Validaciones básicas
  if (!title || !objective || !numberOfQuestions) {
    return res.status(400).json({
      error: 'Debe proporcionar título, objetivo y la cantidad de preguntas que desea generar.'
    });
  }

  try {
    // Construcción del prompt para OpenAI
    const prompt = `
      Eres un experto en revisiones sistemáticas de literatura.
      Basado en el siguiente estudio:
      - Título: ${title}
      - Objetivo: ${objective}

      Genera un arreglo JSON con ${numberOfQuestions} preguntas de extracción de datos,
      donde cada objeto incluya:
      - "pregunta": la pregunta a realizar
      - "tipo": un valor que puede ser "Booleano", "Texto", "Decimal", "Entero" o "Fecha"

      El formato debe ser exactamente:
      [
        { "pregunta": "Texto de la pregunta 1", "tipo": "Booleano" },
        { "pregunta": "Texto de la pregunta 2", "tipo": "Texto" }
        ...
      ]

      No incluyas explicaciones adicionales ni rodees la respuesta de texto extra;
      solamente devuelve ese arreglo en JSON.
    `;

    // Llamada a la API de OpenAI usando axios (ajusta la importación y configuración según tu proyecto)
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-turbo',
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

    // Extraer la respuesta generada por GPT-4
    const generatedText = response.data.choices[0].message.content.trim();

    // Se asume que la respuesta es un arreglo JSON válido
    const generatedQuestions = JSON.parse(generatedText);

    // Enviar la respuesta al cliente
    res.status(200).json({ questions: generatedQuestions });
  } catch (error) {
    console.error('Error al generar preguntas de extracción de datos:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud.' });
  }
});

// Ruta para generar sugerencias de extracción de datos
app.post('/api/generate-extraction-suggestions', async (req, res) => {
  const { url, questions } = req.body;
  
  if (!url || !questions || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Debe proporcionar una URL y una lista de preguntas de extracción.' });
  }
  
  try {
    // Construir una cadena que enumere las preguntas y su tipo de respuesta.
    const questionsText = questions.map((q, index) => 
      `${index + 1}. ${q.pregunta} (Tipo: ${q.tipoRespuesta})`
    ).join("\n");

    // Construir el prompt para GPT-4.
    const prompt = `
Tienes la siguiente URL de un artículo científico:
${url}

Y las siguientes preguntas de extracción de datos:
${questionsText}

Para cada pregunta, proporciona una sugerencia de respuesta que se ajuste al tipo de respuesta indicado, sin explicaciones adicionales.

Responde en formato JSON siguiendo este ejemplo:
{
  "suggestions": [
    { "answer": "Respuesta sugerida para la pregunta 1" },
    { "answer": "Respuesta sugerida para la pregunta 2" },
    ...
  ]
}
    `;

    // Llamada a la API de OpenAI.
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: 'Eres un asistente experto en extracción de datos y en generar sugerencias precisas para investigaciones.' },
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

    // Extraer la respuesta de OpenAI.
    const generatedContent = response.data.choices[0].message.content.trim();
    let suggestions;
    try {
      // Intentar parsear la respuesta en JSON
      suggestions = JSON.parse(generatedContent).suggestions;
    } catch (e) {
      // Si no se puede parsear, devolver el contenido crudo
      suggestions = generatedContent;
    }
    
    res.status(200).json({ suggestions });
  } catch (error) {
    console.error('Error al generar sugerencias de extracción:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud con OpenAI' });
  }
});






// Ruta para generar la Introducción
app.post('/api/generate-introduction', async (req, res) => {
  const {
    title,
    description,
    objective,
    area_conocimiento,
    tipo_investigacion
  } = req.body;

  if (!title || !description || !objective) {
    return res.status(400).json({ error: 'Faltan datos obligatorios en la solicitud (title, description, objective)' });
  }

  try {
    const prompt = `
Utilizando la siguiente información, genera un borrador de la sección de Introducción para un artículo científico:
- Título de la revisión: ${title}
- Descripción: ${description}
- Objetivo: ${objective}
- Área de Conocimiento: ${area_conocimiento || 'No especificado'}
- Tipo de Investigación: ${tipo_investigacion || 'No especificado'}

La Introducción debe presentar el contexto, la motivación y la relevancia del estudio, en un tono académico y formal.
    `;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: 'Eres un asistente experto en redacción académica.' },
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

    const generatedText = response.data.choices[0].message.content.trim();
    res.status(200).json({ introduction: generatedText });
  } catch (error) {
    console.error('Error al llamar a OpenAI:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud con OpenAI' });
  }
});

// Ruta para generar Trabajos Relacionados
app.post('/api/generate-trabajos-relacionados', async (req, res) => {
  const { title, keywords, criterios_seleccion, description } = req.body;

  if (!title || !keywords || !criterios_seleccion) {
    return res.status(400).json({ error: 'Faltan datos obligatorios en la solicitud (title, keywords, criterios_seleccion)' });
  }

  try {
    const prompt = `
Utilizando la siguiente información, genera un borrador de la sección de Trabajos Relacionados para un artículo científico:
- Título de la revisión: ${title}
- Palabras clave: ${keywords}
- Criterios de selección: ${criterios_seleccion}
- Descripción breve: ${description || 'No se proporcionó descripción adicional.'}

Resume y analiza los estudios previos relevantes, enfatizando cómo aportan al conocimiento sobre el tema.
    `;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Eres un asistente experto en redacción académica.' },
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

    const generatedText = response.data.choices[0].message.content.trim();
    res.status(200).json({ trabajos_relacionados: generatedText });
  } catch (error) {
    console.error('Error al llamar a OpenAI:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud con OpenAI' });
  }
});

// Ruta para generar Metodología
app.post('/api/generate-metodologia', async (req, res) => {
  const { methodology, alcance, bases_bibliograficas, framework } = req.body;

  if (!methodology || !bases_bibliograficas || !framework) {
    return res.status(400).json({ error: 'Faltan datos obligatorios en la solicitud (methodology, bases_bibliograficas, framework)' });
  }

  try {
    const prompt = `
Utilizando la siguiente información, genera un borrador de la sección de Metodología para un artículo científico:
- Metodología de la revisión: ${methodology}
- Alcance: ${alcance || 'No especificado'}
- Gestión de bases bibliográficas: ${bases_bibliograficas}
- Framework a utilizar: ${framework} (ej. PICO, PICOC, PICOTT, SPICE)

Describe detalladamente el proceso de búsqueda, criterios de inclusión y exclusión, y métodos de evaluación de calidad, en un tono académico y formal.
    `;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Eres un asistente experto en metodología de investigación.' },
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

    const generatedText = response.data.choices[0].message.content.trim();
    res.status(200).json({ metodologia: generatedText });
  } catch (error) {
    console.error('Error al llamar a OpenAI:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud con OpenAI' });
  }
});

// Ruta para generar Resultados
app.post('/api/generate-resultados', async (req, res) => {
  const { studies_data, extraction_responses } = req.body;

  if (!studies_data || !extraction_responses) {
    return res.status(400).json({ error: 'Faltan datos obligatorios en la solicitud (studies_data, extraction_responses)' });
  }

  try {
    const prompt = `
Utilizando la siguiente información, genera un borrador de la sección de Resultados para un artículo científico:
- Datos de los estudios (aceptados, duplicados, rechazados): ${studies_data}
- Respuestas de evaluación y extracción de datos: ${extraction_responses}

Resume los hallazgos principales de la revisión sistemática, presentando estadísticas clave y patrones identificados en un tono académico.
    `;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Eres un asistente experto en redacción académica y análisis de datos.' },
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

    const generatedText = response.data.choices[0].message.content.trim();
    res.status(200).json({ resultados: generatedText });
  } catch (error) {
    console.error('Error al llamar a OpenAI:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud con OpenAI' });
  }
});

// Ruta para generar Discusión
app.post('/api/generate-discusion', async (req, res) => {
  const { results_summary, literature_review } = req.body;

  if (!results_summary || !literature_review) {
    return res.status(400).json({ error: 'Faltan datos obligatorios en la solicitud (results_summary, literature_review)' });
  }

  try {
    const prompt = `
Utilizando la siguiente información, genera un borrador de la sección de Discusión para un artículo científico:
- Resumen de resultados: ${results_summary}
- Comparación con la literatura existente: ${literature_review}

Analiza e interpreta los hallazgos, discutiendo sus implicaciones, limitaciones y posibles direcciones futuras en un tono académico.
    `;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Eres un asistente experto en redacción académica y análisis crítico.' },
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

    const generatedText = response.data.choices[0].message.content.trim();
    res.status(200).json({ discusion: generatedText });
  } catch (error) {
    console.error('Error al llamar a OpenAI:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud con OpenAI' });
  }
});

// Ruta para generar Limitaciones
app.post('/api/generate-limitaciones', async (req, res) => {
  const { methodological_issues, search_limitations } = req.body;

  if (!methodological_issues || !search_limitations) {
    return res.status(400).json({ error: 'Faltan datos obligatorios en la solicitud (methodological_issues, search_limitations)' });
  }

  try {
    const prompt = `
Utilizando la siguiente información, genera un borrador de la sección de Limitaciones para un artículo científico:
- Problemas metodológicos: ${methodological_issues}
- Limitaciones de la búsqueda y selección de estudios: ${search_limitations}

Describe de forma clara y concisa las limitaciones que afectan la interpretación de los resultados, en un tono académico.
    `;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Eres un asistente experto en redacción académica.' },
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

    const generatedText = response.data.choices[0].message.content.trim();
    res.status(200).json({ limitaciones: generatedText });
  } catch (error) {
    console.error('Error al llamar a OpenAI:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud con OpenAI' });
  }
});

// Ruta para generar Conclusión
app.post('/api/generate-conclusion', async (req, res) => {
  const { summary_results, future_research } = req.body;

  if (!summary_results || !future_research) {
    return res.status(400).json({ error: 'Faltan datos obligatorios en la solicitud (summary_results, future_research)' });
  }

  try {
    const prompt = `
Utilizando la siguiente información, genera un borrador de la sección de Conclusión para un artículo científico:
- Resumen de hallazgos: ${summary_results}
- Recomendaciones para futuras investigaciones: ${future_research}

Redacta un texto conciso y claro que resuma los aportes del estudio y sugiera futuras líneas de investigación, en un tono académico.
    `;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Eres un asistente experto en redacción académica.' },
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

    const generatedText = response.data.choices[0].message.content.trim();
    res.status(200).json({ conclusion: generatedText });
  } catch (error) {
    console.error('Error al llamar a OpenAI:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud con OpenAI' });
  }
});

// Ruta para generar Referencias
app.post('/api/generate-referencias', async (req, res) => {
  const { citations_list, format } = req.body; // format puede ser APA, IEEE, etc.

  if (!citations_list || !format) {
    return res.status(400).json({ error: 'Faltan datos obligatorios en la solicitud (citations_list, format)' });
  }

  try {
    const prompt = `
Utilizando la siguiente lista de citas: ${citations_list},
genera una lista de referencias bibliográficas en formato ${format} para un artículo científico.
Asegúrate de que el formato sea correcto y que cada referencia esté ordenada alfabéticamente.
    `;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Eres un asistente experto en redacción y formato de referencias bibliográficas.' },
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

    const generatedText = response.data.choices[0].message.content.trim();
    res.status(200).json({ referencias: generatedText });
  } catch (error) {
    console.error('Error al llamar a OpenAI:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud con OpenAI' });
  }
});

// Inicia el servidor en localhost:3000
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
