// controllers/trabajosRelacionadosController.js
const { callOpenAI } = require('../services/openaiService');
const axios = require('axios');

// Traduce keywords al inglés
async function translateKeywordsToEnglish(keywordsEs) {
  const prompt = `Traduce estas palabras clave al inglés separadas por espacios: "${keywordsEs}"`;
  try {
    const response = await callOpenAI([
      { role: 'system', content: 'Eres un traductor de palabras clave.' },
      { role: 'user', content: prompt }
    ], 'gpt-4o-mini', 0.3, 200);
    return response.replace(/["\r\n]/g, '').trim();
  } catch {
    return keywordsEs;
  }
}

// Puntúa relevancia en base a presencia de keywords
function relevanceScore(text, keywords) {
  return keywords
    .split(/\s+/)
    .reduce((score, kw) => score + (text.includes(kw.toLowerCase()) ? 1 : 0), 0);
}

// Busca referencias en CrossRef por relevancia
async function fetchRelevantReferences(query, minArticles = 5) {
  const resp = await axios.get('https://api.crossref.org/works', {
    params: {
      query,
      rows: 10,
      filter: 'type:journal-article',
      sort: 'relevance'
    }
  });
  return (resp.data.message.items || [])
    .filter(item => item.title?.length && item.abstract)
    .slice(0, minArticles);
}

// Obtiene y puntúa referencias en español e inglés
async function getBestReferences(title, keywords, description) {
  const kwsEs = keywords;
  const kwsEn = await translateKeywordsToEnglish(kwsEs);
  const [refsEs, refsEn] = await Promise.all([
    fetchRelevantReferences(kwsEs),
    fetchRelevantReferences(kwsEn)
  ]);

  const combined = [...refsEs, ...refsEn];
  const scored = combined.map(item => {
    const text = [
      ...(item.title || []),
      (item.abstract || '').replace(/<[^>]+>/g, '')
    ].join(' ').toLowerCase();
    const score = relevanceScore(text, `${kwsEs} ${kwsEn}`);
    return { item, score };
  });

  // Ordena y devuelve los top 5 únicos por DOI
  const seen = new Set();
  return scored
    .sort((a, b) => b.score - a.score)
    .map(r => r.item)
    .filter(i => {
      if (seen.has(i.DOI)) return false;
      seen.add(i.DOI);
      return true;
    })
    .slice(0, 5);
}

// Formatea una referencia en estilo APA7
function formatAPA7(item) {
  const authors = (item.author || [])
    .map(a => `${a.family}, ${a.given[0]}.`)
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

// Extrae el abstract para usar en el prompt
function abstractArticle(item) {
  const authors = (item.author || [])
    .map(a => `${a.family}, ${a.given[0]}.`)
    .join('; ');
  const title = item.title[0];
  const abstract = item.abstract || 'No abstract available.';
  return `${authors} ${title}. ${abstract}`;
}

// Controlador principal
async function generateTrabajosRelacionados(req, res) {
  const { title, keywords, criterios_seleccion, description = '' } = req.body;
  if (!title || !keywords || !criterios_seleccion) {
    return res.status(400).json({ error: 'Faltan datos obligatorios: titulo, keywords o criterios de seleccion.' });
  }

  try {
    // 1) Obtener referencias
    const bestRefs = await getBestReferences(title, keywords, description);
    const formattedRefs = bestRefs.map(formatAPA7);

    // 2) Extraer apellidos (solo el primer apellido) para cada referencia
    const authorsByRef = bestRefs.map(item =>
      (item.author || [])
        .map(a => a.family.split(' ')[0])
    );


    // Aquí añadimos un salto de línea al final de cada referencia
    const referencesWithBreak = formattedRefs.map((ref, i) => `[${i + 1}] ${ref}\n`);

    // 2) Montar prompt para IA
    const refsForPrompt = referencesWithBreak.join('');
    const authorListForPrompt = authorsByRef
      .map((names, i) => `[${i + 1}]: ${names.join(' y ')}`)
      .join('\n');
    const abstractsForPrompt = bestRefs.map(abstractArticle).join('\n\n');

    console.log('Autores por referencia:', authorListForPrompt);

    // 5) Prompt con reglas de citación dinámicas
    const prompt = `
Genera exactamente este JSON:
{
  "trabajos_relacionados": "<texto en al menos 5 párrafos>",
  "references": ["<APA1>", "<APA2>", "..."]
}

Reglas estrictas para citas en el texto:
- Usa solo el primer apellido de cada autor.
- Formato de cita: Apellido1 y Apellido2 (Año) [n].
- Aplica esto a todas las referencias indicadas.
- añade un salto de línea entre cada referencia.
- Tono académico-formal, párrafos de máximo 4-5 oraciones, concluye 
con una breve conclusión sobre la importancia de estas referencias.

Referencias disponibles:
${refsForPrompt}

Autores por referencia:
${authorListForPrompt}

- Basa el contenido en los abstracts:
${abstractsForPrompt}

Datos del artículo:
Título: ${title}
Palabras clave: ${keywords}
Criterios de selección: ${criterios_seleccion}
Descripción: ${description}
`;

    // 3) Llamar a OpenAI
    const aiResp = await callOpenAI([
      { role: 'system', content: 'Redactor académico usando referencias proporcionadas.' },
      { role: 'user', content: prompt }
    ], 'gpt-4o-mini', 0.3, 10000);

    // 4) Intentar extraer JSON de forma robusta
    const start = aiResp.indexOf('{');
    const end = aiResp.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      console.warn('No se encontró JSON en IA, devolviendo respuesta cruda.');
      return res.status(502).json({ 
        error: 'No se pudo parsear JSON de IA.', 
        raw: aiResp 
      });
    }
    const jsonString = aiResp.slice(start, end + 1);
    let finalJson;
    try {
      finalJson = JSON.parse(jsonString);
    } catch (parseErr) {
      console.error('Error al parsear JSON:', parseErr);
      return res.status(502).json({ 
        error: 'JSON mal formado en respuesta de IA.', 
        raw: aiResp 
      });
    }

    // 5) Devolver resultado
    return res.json({
      trabajos_relacionados: finalJson.trabajos_relacionados,
      references: formattedRefs.map((r, i) => `[${i + 1}] ${r}`)
    });

  } catch (err) {
    console.error('Error en generateTrabajosRelacionados:', err);
    return res.status(500).json({ error: 'Error interno generando la sección.' });
  }
}

module.exports = { generateTrabajosRelacionados };
