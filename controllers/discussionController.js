// controllers/discussionController.js
const { callOpenAI } = require('../services/openaiService');
const axios = require('axios');

async function searchCrossRef(query) {
  try {
    const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=1`;
    const res = await axios.get(url);
    const items = res.data.message.items;

    if (items.length > 0) {
      const item = items[0];
      const authors = item.author?.map(a => `${a.family}, ${a.given?.[0]}.`).join(', ') || 'Autor desconocido';
      const year = item.issued?.['date-parts']?.[0]?.[0] || 's.f.';
      const title = item.title?.[0] || 'Título desconocido';
      const journal = item['container-title']?.[0] || 'Revista desconocida';
      const volume = item.volume || '';
      const issue = item.issue || '';
      const pages = item.page || '';
      const doi = item.DOI || '';

      return `${authors} (${year}). ${title}. ${journal}${volume ? `, ${volume}` : ''}${issue ? `(${issue})` : ''}${pages ? `, ${pages}` : ''}. https://doi.org/${doi}`;
    }
  } catch (err) {
    console.error('Error consultando Crossref:', err.message);
  }

  return null; // Retorna null si no hay resultado o algo falla
}


async function generateDiscussion(req, res) {
  const { reflexion_inicial, ["¿Qué busca responder?"]: queBuscaResponder, referencias } = req.body;

  if (!reflexion_inicial || !queBuscaResponder || !referencias) {
    return res.status(400).json({ error: 'Faltan campos obligatorios en el JSON de entrada.' });
  }

  const resultsSummary = reflexion_inicial.join(' ') + ' ' + queBuscaResponder.join(' ');

  const prompt = `
Eres un asistente experto en redacción académica. Tu tarea es generar la sección de Discusión de un artículo científico a partir de estos resultados:

"${resultsSummary}"

Instrucciones precisas:
- Contrasta estos resultados (tus resultados) con hallazgos de otros artículos científicos REALES publicados recientemente. Usa citas en formato APA (Autor, año).
- Debes presentar tanto similitudes como diferencias significativas.
- Redacta exactamente 2-3 párrafos académicos.
- Finalmente, genera exactamente 2 referencias APA con DOI real que respalden esta discusión.

Formato estricto de respuesta en JSON:

{
  "discusion": "<2-3 párrafos separados por \\n\\n>",
  "referencias": [
    "Referencia APA 1",
    "Referencia APA 2"
  ]
}
`;

  try {
    const messages = [
      { role: 'system', content: 'Eres un experto en redacción científica y análisis crítico.' },
      { role: 'user', content: prompt }
    ];

    let aiRaw = await callOpenAI(messages, 'gpt-4o-mini', 0.3, 3000);
    aiRaw = aiRaw.replace(/^```json|```$/g, '').trim();
    const parsed = JSON.parse(aiRaw);

    // Verificación de referencias usando Crossref
    const verifiedRefs = [];
    for (const ref of parsed.referencias) {
      const crossRefVerified = await searchCrossRef(ref);
      verifiedRefs.push(crossRefVerified || ref);
    }

    parsed.referencias = verifiedRefs;

    return res.json(parsed);

  } catch (err) {
    console.error('Error generando discusión:', err);
    return res.status(500).json({ error: 'Error al generar la discusión con IA.' });
  }
}

module.exports = { generateDiscussion };
