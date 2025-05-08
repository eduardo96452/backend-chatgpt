// controllers/discussionController.js
const { callOpenAI } = require('../services/openaiService');
const axios = require('axios');

const STOPWORDS = new Set([
  'que','de','la','el','y','en','los','se','con','para','del','las','por','a','su','lo','un','una','es','al','como',
  'the','and','of','in','on','for','with','to','a','an','is','are','be','by','this','that'
]);

function extractKeywordsLocal(text, n = 7) {
  return Array.from(new Set(
    text.toLowerCase().replace(/[\d.,;:"“”()¿?¡!]/g, '').split(/\s+/)
      .filter(w => w.length > 4 && !STOPWORDS.has(w))
  )).slice(0, n).join(' ');
}

async function extractKeywordsWithGPT(text, n = 7) {
  const prompt = `Extrae las ${n} palabras clave más representativas separadas por comas del texto: "${text}"`;
  try {
    const response = await callOpenAI([
      { role: 'system', content: 'Extrae keywords.' },
      { role: 'user', content: prompt }
    ], 'gpt-4o-mini', 0.3, 500);
    return response.replace(/[\`\"\n]/g, '').split(',').slice(0, n).join(' ').trim();
  } catch {
    return extractKeywordsLocal(text, n);
  }
}

async function translateKeywordsToEnglish(keywordsEs) {
  const prompt = `Traduce estas palabras clave al inglés separadas por espacios: "${keywordsEs}"`;
  try {
    const response = await callOpenAI([
      { role: 'system', content: 'Traduce a inglés.' },
      { role: 'user', content: prompt }
    ], 'gpt-4o-mini', 0.3, 200);
    return response.replace(/[\`\"\n]/g, '').trim();
  } catch {
    return keywordsEs;
  }
}

async function fetchRelevantReferences(query, minArticles = 2) {
  const resp = await axios.get('https://api.crossref.org/works', {
    params: { query, rows: 10, filter: 'type:journal-article', sort: 'relevance' }
  });
  return resp.data.message.items
    .filter(item => item.abstract && item.title)
    .slice(0, minArticles);
}

function formatAPA7(item) {
  const authors = (item.author||[]).map(a => `${a.family}, ${a.given[0]}.`).join('; ');
  const year = item.issued['date-parts'][0][0];
  const title = item.title[0];
  const journal = item['container-title'][0];
  const volume = item.volume ? `, ${item.volume}` : '';
  const issue = item.issue ? `(${item.issue})` : '';
  const pages = item.page ? `, ${item.page}` : '';
  const doi = item.DOI;
  return `${authors} (${year}). ${title}. ${journal}${volume}${issue}${pages}. https://doi.org/${doi}`;
}

async function generateDiscussion(req, res) {
  const body = req.body;
  const reflexion = body.reflexion_inicial;
  const referenciasPrev = body.referencias;
  // Todas las demás claves se consideran parte de los resultados (preguntas y respuestas)
  const otherKeys = Object.keys(body).filter(k => k !== 'reflexion_inicial' && k !== 'referencias');

  if (!reflexion || !Array.isArray(referenciasPrev) || otherKeys.length === 0) {
    return res.status(400).json({ error: 'Faltan campos obligatorios en el JSON de entrada.' });
  }

  // Construir texto de resultados combinados
  const resultadosText = otherKeys
    .map(key => Array.isArray(body[key]) ? body[key].join(' ') : String(body[key]))
    .join(' ');

  const combinedText = `${Array.isArray(reflexion) ? reflexion.join(' ') : reflexion} ${resultadosText}`;

  // Extraer keywords para búsqueda
  const kwsEs = await extractKeywordsWithGPT(combinedText);
  const kwsEn = await translateKeywordsToEnglish(kwsEs);
  const [refsEs, refsEn] = await Promise.all([
    fetchRelevantReferences(kwsEs),
    fetchRelevantReferences(kwsEn)
  ]);

  // Tomar dos referencias
  const allRefs = [...refsEs, ...refsEn].slice(0, 2);
  const formattedRefs = allRefs.map(formatAPA7);
  const refsForPrompt = formattedRefs.map((r, i) => `[${i+1}] ${r}`).join('\n');

  const prompt = `
Eres un asistente experto en redacción académica. Tu tarea es generar la sección de Discusión de un artículo científico a partir de estos resultados:\n\n"${combinedText}"\n\nInstrucciones precisas:\n- Contrasta estos resultados con hallazgos de otros artículos científicos REALES publicados recientemente usando estas referencias numeradas:\n${refsForPrompt}\n\n- Usa citas en formato APA (Autor, año).\n- Debes presentar tanto similitudes como diferencias significativas.\n- Redacta exactamente 2-3 párrafos académicos.\n\nFormato estricto de respuesta en JSON:\n{\n  "discusion": "<2-3 párrafos separados por \\n\\n>",\n  "referencias": ["<APA1>", "<APA2>"]\n}\n`;

  try {
    const aiRaw = await callOpenAI([
      { role: 'system', content: 'Redactor académico contrastando resultados con artículos proporcionados.' },
      { role: 'user', content: prompt }
    ], 'gpt-4o-mini', 0.3, 4000);
    const clean = aiRaw.replace(/^```json\s*|\s*```$/g, '').trim();
    const parsed = JSON.parse(clean);
    return res.json(parsed);
  } catch (err) {
    console.error('Error generando discusión:', err);
    return res.status(500).json({ error: 'Error al generar la discusión con IA.' });
  }
}

module.exports = { generateDiscussion };
