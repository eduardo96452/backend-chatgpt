// controllers/discussionController.js
const { callOpenAI } = require('../services/openaiService');
const axios = require('axios');

async function generateDiscussion(req, res) {
  const { reflexion_inicial, referencias, keywords, ...rest } = req.body;
  if (
    !Array.isArray(reflexion_inicial) ||
    !Array.isArray(referencias) ||
    typeof keywords !== 'string'
  ) {
    return res.status(400).json({ error: 'Campos obligatorios faltantes.' });
  }
  const resultadosArr = Object.values(rest).flatMap(v => Array.isArray(v) ? v : [String(v)]);
  const combinedText = [...reflexion_inicial, ...resultadosArr].join(' ');
  const kwsEs = keywords;
  let kwsEn;
  try {
    const aiTrans = await callOpenAI([
      { role: 'system', content: 'Traduce a inglés.' },
      { role: 'user', content: `Traduce estas keywords al inglés separadas por espacios: "${kwsEs}"` }
    ], 'gpt-4o-mini', 0.3, 200);
    kwsEn = aiTrans.replace(/["\n]/g, '').trim();
  } catch {
    kwsEn = kwsEs;
  }
  const fetchRefs = async q => {
    const resp = await axios.get('https://api.crossref.org/works', {
      params: { query: q, rows: 5, filter: 'type:journal-article', sort: 'relevance' }
    });
    return resp.data.message.items.slice(0, 2);
  };
  const [refsEs, refsEn] = await Promise.all([fetchRefs(kwsEs), fetchRefs(kwsEn)]);
  const items = [...refsEs, ...refsEn].slice(0,2);
  const formattedRefs = items.map(item => {
    const authors = (item.author||[]).map(a => `${a.family}, ${a.given[0]}.`).join('; ');
    const year = item.issued['date-parts'][0][0];
    const title = item.title[0];
    const journal = item['container-title'][0] || '';
    return `${authors} (${year}). ${title}. ${journal}. https://doi.org/${item.DOI}`;
  });
  const abstractsForPrompt = items
    .map(item => (item.abstract||'No abstract available.').replace(/<[^>]+>/g,'')).join('<br><br>');
  const refsForPrompt = formattedRefs.map((r,i)=>`[${i+1}] ${r}`).join('<br><br>');
  const prompt = `
Eres un asistente experto en redacción académica.
Tu tarea es generar la sección de Discusión de un artículo científico
basada en estos resultados:
"${combinedText}"

Contrasta estos resultados con hallazgos reales usando referencias numeradas:<br><br>
${refsForPrompt}

- Basa el contenido en los abstracts:<br><br>
${abstractsForPrompt}

- Usa citas en formato APA (Autor, año).
- Redacta 2-3 párrafos académicos.

Respuesta JSON:
{
  "discusion": "<2-3 párrafos separados por <br><br>>",
  "referencias": ["<APA1><br><br>","<APA2><br><br>"]
}
`;
  try {
    const aiRaw = await callOpenAI([
      { role:'system', content:'Redactor académico contrastando resultados.' },
      { role:'user', content:prompt }
    ], 'gpt-4o-mini',0.3,4000);
    const clean = aiRaw.replace(/^```json\s*|\s*```$/g,'').trim();
    const parsed = JSON.parse(clean);
    // No post-process necesario: ya trae <br> en JSON
    console.log('Respuesta de IA:',parsed);
    return res.json(parsed);
  } catch(err) {
    console.error('Error al generar discusión:',err);
    return res.status(500).json({ error:'Error al generar la discusión con IA.' });
  }
}

module.exports = { generateDiscussion };