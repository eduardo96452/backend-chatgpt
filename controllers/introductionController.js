// controllers/introductionController.js
const { callOpenAI } = require('../services/openaiService');
const axios = require('axios');

// Stop-words mixtas en español e inglés
const STOPWORDS = new Set([
  'que','de','la','el','y','en','los','se','con','para','del','las','por','a','su','lo','un','una','es','al','como',
  'the','and','of','in','on','for','with','to','a','an','is','are','be','by','this','that'
]);

// Extracción local de keywords
function extractKeywordsLocal(text, n = 7) {
  return Array.from(new Set(
    text.toLowerCase()
      .replace(/[\d.,;:"“”()¿?¡!]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 4 && !STOPWORDS.has(w))
  )).slice(0, n).join(' ');
}

// Extrae keywords con GPT
async function extractKeywordsWithGPT(text, n = 7) {
  const prompt = `Extrae las ${n} palabras clave más representativas, separadas por comas, del siguiente texto: "${text}"`;
  try {
    const resp = await callOpenAI([
      { role: 'system', content: 'Eres un asistente que extrae palabras clave.' },
      { role: 'user', content: prompt }
    ], 'gpt-4o-mini', 0.3, 500);
    return resp.replace(/[\`\"\n]/g, '').split(',').slice(0, n).join(' ').trim();
  } catch {
    return extractKeywordsLocal(text, n);
  }
}

// Traduce keywords al inglés
async function translateKeywordsToEnglish(keywordsEs) {
  const prompt = `Traduce estas palabras clave al inglés separadas por espacios: "${keywordsEs}"`;
  try {
    const resp = await callOpenAI([
      { role: 'system', content: 'Eres un traductor conciso al inglés.' },
      { role: 'user', content: prompt }
    ], 'gpt-4o-mini', 0.3, 200);
    return resp.replace(/[\`\"\n]/g, '').trim();
  } catch {
    return keywordsEs;
  }
}

// Busca referencias en CrossRef
async function fetchRelevantReferences(query, rows = 5) {
  const res = await axios.get('https://api.crossref.org/works', {
    params: { query: query, rows, filter: 'type:journal-article', sort: 'relevance' }
  });
  return (res.data.message.items || [])
    .filter(i => i.title && i.abstract)
    .slice(0, rows);
}

// Formatea ítem CrossRef a APA7
function formatAPA7(item) {
  const authors = (item.author || [])
    .map(a => `${a.family}, ${a.given?.[0]}.`)
    .join('; ');
  const year = item.issued['date-parts'][0][0];
  const title = item.title[0];
  const journal = item['container-title'][0] || '';
  const volume = item.volume ? `, ${item.volume}` : '';
  const issue = item.issue ? `(${item.issue})` : '';
  const pages = item.page ? `, ${item.page}` : '';
  const doi = item.DOI;
  return `${authors} (${year}). ${title}. *${journal}*${volume}${issue}${pages}. https://doi.org/${doi}`;
}

// Controlador para generar introducción
async function generateIntroduction(req, res) {
  const { title, description, objective, area_conocimiento, tipo_investigacion } = req.body;
  if (!title || !description || !objective) {
    return res.status(400).json({ error: 'Faltan datos obligatorios: title, description, objective.' });
  }

  // 1) Construir contexto para búsqueda: combina campos
  const contextText = `${title} ${description} ${objective} ${area_conocimiento || ''} ${tipo_investigacion || ''}`;

  // 2) Extraer keywords en español e inglés
  let kwsEs = await extractKeywordsWithGPT(contextText);
  if (!kwsEs) kwsEs = extractKeywordsLocal(contextText);
  const kwsEn = await translateKeywordsToEnglish(kwsEs);

  // 3) Buscar artículos relevantes en ambos idiomas
  const [refsEs, refsEn] = await Promise.all([
    fetchRelevantReferences(kwsEs),
    fetchRelevantReferences(kwsEn)
  ]);
  const topRefs = [...refsEs, ...refsEn].slice(0, 5);
  const formattedRefs = topRefs.map(formatAPA7);

  // 4) Preparar referencias numeradas para el prompt
  const refsForPrompt = formattedRefs.map((r, idx) => `[${idx+1}] ${r}`).join('\n\n');

  // 5) Prompt de introducción usando referencias encontradas
  const prompt = `
Genera **exactamente** este JSON:
{
  "introduction": "<texto>",
  "references": ["<IEEE1>","<IEEE2>","…"]
}

Reglas:
- Usa **estas** referencias numeradas (IEEE):
${refsForPrompt}
- Tono: académico-formal.
- Párrafos de 2–3 oraciones.
- Longitud total: 3900–4100 caracteres.
- Máximo 1000 tokens.
- Concluir con:
  "Este documento se organizó de la siguiente manera: en la sección 2 se abordó los trabajos relacionados, en la sección 3 se presentó la metodología, en la sección 4 se establecieron los resultados, en la sección 5 se desarrolló la discusión, en la sección 6 se describieron las limitaciones y en la sección 7 se detallaron las conclusiones."

Datos:
Título: ${title}
Descripción: ${description}
Objetivo: ${objective}
Área de Conocimiento: ${area_conocimiento || 'N/A'}
Tipo de Investigación: ${tipo_investigacion || 'N/A'}
`;

  try {
    const aiRaw = await callOpenAI([
      { role: 'system', content: 'Eres un redactor académico experto.' },
      { role: 'user', content: prompt }
    ], 'gpt-4o-mini', 0.3, 3000);

    // 6) Limpiar respuesta y parsear JSON
    const clean = aiRaw.replace(/^```json\s*/,'').replace(/\s*```$/,'').trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}$/);
    const jsonString = jsonMatch ? jsonMatch[0] : clean;
    const parsed = JSON.parse(jsonString);

    return res.json({
      introduction: parsed.introduction,
      references: formattedRefs.map((r, idx) => `[${idx+1}] ${r}`)
    });

  } catch (err) {
    console.error('❌ generateIntroduction error:', err);
    return res.status(500).json({ error: 'Error interno generando introducción.' });
  }
}

module.exports = { generateIntroduction };
