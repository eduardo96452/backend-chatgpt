// controllers/methodologyController.js
const { callOpenAI } = require('../services/openaiService');

// Función para limpiar la respuesta de posibles delimitadores Markdown
function cleanResponse(response) {
  return response
    .replace(/^```(json)?\n/, '')
    .replace(/\n```$/, '')
    .trim();
}

async function generateMethodologyStructure(req, res) {
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
    // Uso del servicio para llamar a OpenAI
    const messages = [
      { role: 'system', content: 'Eres un asistente experto en investigación académica.' },
      { role: 'user', content: prompt }
    ];
    let structuredResponse = await callOpenAI(messages);

    // Limpiar la respuesta para remover delimitadores Markdown
    structuredResponse = cleanResponse(structuredResponse);

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
}

module.exports = { generateMethodologyStructure };
