// controllers/searchStringController.js
const { callOpenAI } = require('../services/openaiService');

async function generateSearchString(req, res) {
  const { keywords, idioma } = req.body;

  // Validar que se envíe una lista de keywords y el idioma (contexto)
  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ error: 'Debe proporcionar una lista de palabras clave con sinónimos.' });
  }
  if (!idioma) {
    return res.status(400).json({ error: 'Debe proporcionar el idioma.' });
  }

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

  // Construir el prompt:
  // Se usa el idioma como contexto para determinar el formato de la cadena final,
  // pero no debe aparecer explícitamente en la cadena de búsqueda.
  const prompt = `
Utilizando únicamente la siguiente información, genera una cadena de búsqueda avanzada en formato booleano, siguiendo estas pautas:
- Palabras clave y sinónimos: ${keywordsString}

Usa la siguiente información como contexto para determinar el idioma de la cadena:
- Idioma deseado a traducir la cadena: ${idioma}

Sin embargo, la cadena final NO debe incluir la mención explícita del idioma.
La cadena de búsqueda debe formarse con cada término entre comillas, utilizando "OR" para combinar sinónimos y "AND" para unir grupos de términos.
Asegúrate de que la cadena resultante sea insensible a mayúsculas, minúsculas y a la presencia o ausencia de tildes.
Proporciona únicamente la cadena final sin explicaciones adicionales.


Genera la cadena de búsqueda final en ${idioma}.
`;

  try {
    const messages = [
      { role: 'system', content: 'Eres un asistente experto en la generación de cadenas de búsqueda académicas.' },
      { role: 'user', content: prompt }
    ];
    const generatedSearchString = await callOpenAI(messages);
    res.status(200).json({ searchString: generatedSearchString.trim() });
  } catch (error) {
    console.error('Error al generar cadena de búsqueda:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar la solicitud con OpenAI' });
  }
}

module.exports = { generateSearchString };
