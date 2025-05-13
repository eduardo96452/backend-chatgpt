// controllers/introductionController.js
const { callOpenAI } = require('../services/openaiService');
const axios = require('axios');

// Formatea un ítem de CrossRef a estilo APA7
function formatAPA7(item) {
  const authors = (item.author || [])
    .map(a => `${a.family}, ${a.given?.[0]}.`)
    .join('; ');
  const year    = item.issued['date-parts'][0][0];
  const title   = item.title[0];
  const journal = item['container-title'][0] || '';
  const volume  = item.volume ? `, ${item.volume}` : '';
  const issue   = item.issue  ? `(${item.issue})`    : '';
  const pages   = item.page   ? `, ${item.page}`     : '';
  return `${authors} (${year}). ${title}. *${journal}*${volume}${issue}${pages}. https://doi.org/${item.DOI}`;
}

// Controlador para generar la introducción
async function generateIntroduction(req, res) {
  const {
    title,
    description = '',
    objective,
    methodology,
    results_summary,
    discussion_summary = [],
    conclusions = '',
    keywords = '',
    research_questions = []
  } = req.body;

  if (!title || !description || !objective) {
    return res.status(400).json({
      error: 'Faltan datos obligatorios: title, description u objective.'
    });
  }

  // Usamos las keywords enviadas desde el frontend
  const kwsEs = keywords;
  let kwsEn;
  try {
    const aiTrans = await callOpenAI([
      { role: 'system', content: 'Traduce las keywords al inglés.' },
      { role: 'user', content: `Traduce estas keywords al inglés separadas por espacios: "${kwsEs}"` }
    ], 'gpt-4o-mini', 0.3, 200);
    kwsEn = aiTrans.replace(/["\n]/g, '').trim();
  } catch {
    kwsEn = kwsEs;
  }

  // Fetch referencias en ambos idiomas
  async function fetchRefs(query) {
    const resp = await axios.get('https://api.crossref.org/works', {
      params: { query, rows: 5, filter: 'type:journal-article', sort: 'relevance' }
    });
    return resp.data.message.items || [];
  }
  const [refsEs, refsEn] = await Promise.all([fetchRefs(kwsEs), fetchRefs(kwsEn)]);
  const topItems = [...refsEs, ...refsEn].slice(0, 5);

  // Formatear referencias y extraer abstracts
  const formattedRefs = topItems.map(formatAPA7);
  const abstracts = topItems.map(item =>
    (item.abstract || 'No abstract available').replace(/<[^>]+>/g, '')
  );

  // Construir prompts para referencias y abstracts
  const refsPrompt      = formattedRefs.map((r, i) => `[${i+1}] ${r}`).join('\n\n');
  const abstractsPrompt = abstracts.map((a, i) => `[${i+1}] ${a}`).join('\n\n');

  // Armado del prompt con secciones y citas
  const prompt = `
Genera exactamente este JSON:
{
  "introduction": "<texto>",
  "references": ["<APA1>","<APA2>","...]
}

Organiza la introducción en secciones:
- Contexto: 2–3 párrafos sobre el tema, incluyendo referencias donde sean necesarias.
- Problema: 1 párrafo que explique el problema específico del estudio.
- Objetivo: 1 párrafo que explique el objetivo.
- Justificación: 1 párrafo que explique la justificación.
- Preguntas de investigación: 1 párrafo que explique las preguntas.
- Metodología: 1 párrafo que explique la metodología.
- Resultados: 1 párrafo que explique los resultados.
- Discusión: 1 párrafo que explique la discusión.
- Conclusiones: 1 párrafo que explique las conclusiones.

no ubiques estos subtítulos ejemplo: "Contexto, Problema, Objetivo, Justificación" en el texto, solo en el JSON.



Para citar usa: Apellido (Año) [n] donde n es la posición en la lista de referencias.

Concluir con:
"Este documento se organizó de la siguiente manera: en la sección 2 se abordó los trabajos relacionados, en la sección 3 se presentó la metodología, en la sección 4 se establecieron los resultados, en la sección 5 se desarrolló la discusión, en la sección 6 se describieron las limitaciones y en la sección 7 se detallaron las conclusiones."

Referencias (APA7):
${refsPrompt}

Abstracts:
${abstractsPrompt}

Datos:
- Título: ${title}
- Descripción: ${description}
- Objetivo: ${objective}
- Metodología: ${JSON.stringify(methodology)}
- Resultados: ${JSON.stringify(results_summary)}
- Discusión: ${discussion_summary.join(' ')}
- Conclusiones: ${conclusions}
- Keywords: ${kwsEs}
- Research questions: ${research_questions.join(', ')}
`;

  try {
    const aiRaw = await callOpenAI([
      { role: 'system', content: 'Redactor académico experto en introducciones.' },
      { role: 'user', content: prompt }
    ], 'gpt-4o-mini', 0.3, 6000);

    const clean = aiRaw.replace(/^```json\s*/,'').replace(/\s*```$/,'').trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}$/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : clean);

    return res.json({
      introduction: parsed.introduction,
      references: formattedRefs
    });
  } catch (err) {
    console.error('Error en generateIntroduction:', err);
    return res.status(500).json({ error: 'Error interno generando introducción.' });
  }
}

module.exports = { generateIntroduction };