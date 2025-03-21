// controllers/keywordsController.js
const { callOpenAI } = require('../services/openaiService');

// Función para limpiar la respuesta de posibles delimitadores Markdown
function cleanResponse(response) {
  return response
    .replace(/^```(json)?\n/, '')
    .replace(/\n```$/, '')
    .trim();
}

async function generateKeywords(req, res) {
  const { methodologyData } = req.body;

  if (!methodologyData || typeof methodologyData !== 'object') {
    return res.status(400).json({ error: 'Debe proporcionar un objeto con la metodología' });
  }

  // Convertir el objeto de metodología a JSON formateado
  const methodologyJSON = JSON.stringify(methodologyData, null, 2);

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
  ${methodologyJSON}
  `;

  try {
    const messages = [
      { role: 'system', content: 'Eres un asistente experto en terminología científica y metodología de investigación.' },
      { role: 'user', content: prompt }
    ];

    // Llamada al servicio OpenAI con modelo y temperatura opcionales
    let generatedText = await callOpenAI(messages);
    generatedText = cleanResponse(generatedText);

    let generatedKeywords;
    try {
      generatedKeywords = JSON.parse(generatedText);
    } catch (parseError) {
      console.error('Error al parsear JSON:', parseError, 'Respuesta recibida:', generatedText);
      return res.status(500).json({ error: 'La respuesta de OpenAI no es un JSON válido.' });
    }

    res.status(200).json({ keywords: generatedKeywords });
  } catch (error) {
    console.error('Error al generar palabras clave:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud con OpenAI' });
  }
}

module.exports = { generateKeywords };
