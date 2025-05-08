// controllers/trabajosRelacionadosController.js
const { callOpenAI } = require('../services/openaiService');
const axios = require('axios');

const STOPWORDS = new Set([
  'que','de','la','el','y','en','los','se','con','para','del','las','por','a','su','lo','un','una','es','al','como',
  'the','and','of','in','on','for','with','to','a','an','is','are','be','by','this','that'
]);

// Extracción local de keywords
function extractKeywordsLocal(text, n = 7) {
  return Array.from(new Set(
    text.toLowerCase().replace(/[\d.,;:"“”()¿?¡!]/g, '').split(/\s+/)
      .filter(w => w.length > 4 && !STOPWORDS.has(w))
  )).slice(0, n).join(' ');
}

// Extrae keywords con GPT
async function extractKeywordsWithGPT(text, n = 7) {
  const prompt = `Extrae las ${n} palabras clave más representativas separadas por comas del texto: "${text}"`;
  try {
    const response = await callOpenAI([
      { role: 'system', content: 'Extrae keywords.' },
      { role: 'user', content: prompt }
    ], 'gpt-4o-mini', 0.3, 500);
    return response.replace(/[`\"\n]/g, '').split(',').slice(0, n).join(' ').trim();
  } catch (error) {
    return extractKeywordsLocal(text, n);
  }
}

// Traducción de keywords al inglés
async function translateKeywordsToEnglish(keywordsEs) {
  const prompt = `Traduce estas palabras clave al inglés separadas por espacios: "${keywordsEs}"`;
  try {
    const response = await callOpenAI([
      { role: 'system', content: 'Traduce a inglés.' },
      { role: 'user', content: prompt }
    ], 'gpt-4o-mini', 0.3, 200);
    return response.replace(/[`\"\n]/g, '').trim();
  } catch (error) {
    return keywordsEs;
  }
}

// Puntúa relevancia
function relevanceScore(text, keywords) {
  return keywords.split(' ').reduce((score, kw) => score + (text.includes(kw) ? 1 : 0), 0);
}

// Busca múltiples referencias relevantes en CrossRef
async function fetchRelevantReferences(query, minArticles = 5) {
  const resp = await axios.get('https://api.crossref.org/works', {
    params: { query, rows: 10, filter: 'type:journal-article', sort: 'relevance' }
  });
  return resp.data.message.items
    .filter(item => item.abstract && item.title)
    .slice(0, minArticles);
}

// Elige referencias más relevantes (compara español e inglés)
async function getBestReferences(title, keywords, description) {
  const combinedText = `${title} ${keywords} ${description}`;
  const kwsEs = await extractKeywordsWithGPT(combinedText);
  const kwsEn = await translateKeywordsToEnglish(kwsEs);

  const [refsEs, refsEn] = await Promise.all([
    fetchRelevantReferences(kwsEs),
    fetchRelevantReferences(kwsEn)
  ]);

  const scoredRefs = [...refsEs, ...refsEn].map(item => {
    const text = `${item.title.join(' ')} ${(item.abstract||'').replace(/<[^>]+>/g,'')}`;
    return { item, score: relevanceScore(text.toLowerCase(), `${kwsEs} ${kwsEn}`) };
  });

  return scoredRefs.sort((a,b) => b.score - a.score).slice(0, 5).map(r => r.item);
}

// Formatear APA7 con DOI
function formatAPA7(item) {
  const authors = (item.author||[]).map(a => `${a.family}, ${a.given[0]}.`).join('; ');
  const year = item.issued['date-parts'][0][0];
  const title = item.title[0];
  const journal = item['container-title'][0];
  const volume = item.volume ? `, ${item.volume}` : '';
  const issue = item.issue ? `(${item.issue})` : '';
  const pages = item.page ? `, ${item.page}` : '';
  const doi = item.DOI;
  return `${authors} (${year}). ${title}. *${journal}*${volume}${issue}${pages}. https://doi.org/${doi}`;
}

// Controlador principal
async function generateTrabajosRelacionados(req, res) {
  const { title, keywords, criterios_seleccion, description } = req.body;
  if (!title || !keywords || !criterios_seleccion) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  const bestRefs = await getBestReferences(title, keywords, description);
  const formattedRefs = bestRefs.map(formatAPA7);

  const refsForPrompt = formattedRefs.map((ref, idx) => `[${idx + 1}] ${ref}`).join('\n');


  const prompt = `
Genera exactamente este JSON:
{
  "trabajos_relacionados": "<texto>",
  "references": ["<APA1>", "<APA2>", "..."]
}

Reglas estrictas para generar "trabajos_relacionados":
- Usa exactamente estas referencias numeradas, cada vez que cites debes usar marcadores IEEE [1], [2], etc.:
${refsForPrompt}

- La sección debe tener múltiples párrafos (al menos 5 párrafos claramente separados).
- Cada párrafo debe contener máximo 2-3 oraciones.
- Debe tener un tono académico-formal.
- Longitud total de 7000 a 8000 caracteres.
- No repetir referencias de manera innecesaria.
- Terminar con una conclusión breve sobre la importancia de estas referencias.

Datos del artículo:
Título: ${title}
Palabras clave: ${keywords}
Criterios de selección: ${criterios_seleccion}
Descripción: ${description || 'N/A'}
`;

  try {
    let response = await callOpenAI([
      { role: 'system', content: 'Redactor académico usando referencias proporcionadas.' },
      { role: 'user', content: prompt }
    ], 'gpt-4o-mini', 0.3, 3000);

    response = response.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
    const jsonMatch = response.match(/\{[\s\S]*\}$/);
    const jsonString = jsonMatch ? jsonMatch[0] : response;
    const finalJson = JSON.parse(jsonString);

    return res.json({
      trabajos_relacionados: finalJson.trabajos_relacionados,
      references: formattedRefs.map((ref, idx) => `[${idx+1}] ${ref}`)
    });

  } catch (err) {
    return res.status(500).json({ error: 'Error interno generando la sección.' });
  }
}

module.exports = { generateTrabajosRelacionados };