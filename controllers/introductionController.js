// controllers/introductionController.js
const { callOpenAI } = require('../services/openaiService');
const axios = require('axios');

/**
 * Busca en CrossRef la referencia más relevante para un snippet dado
 * y la formatea en APA 7.
 */
async function fetchRealReference(query) {
  try {
    const resp = await axios.get('https://api.crossref.org/works', {
      params: { query, rows: 1 }
    });
    const item = resp.data.message.items[0];
    if (!item) return null;

    const authors = (item.author || [])
      .map(a => {
        const fam = a.family || '';
        const init = a.given ? a.given.trim().charAt(0) + '.' : '';
        return init ? `${fam}, ${init}` : fam;
      })
      .join('; ');

    const year    = item.published?.['date-parts']?.[0]?.[0] || '';
    const title   = Array.isArray(item.title) ? item.title[0] : item.title;
    const journal = Array.isArray(item['container-title'])
      ? item['container-title'][0]
      : item['container-title'];
    const volume  = item.volume || '';
    const issue   = item.issue  ? `(${item.issue})` : '';
    const pages   = item.page   ? `, ${item.page}` : '';

    return `${authors} (${year}). ${title}. *${journal}*, ${volume}${issue}${pages}.`;
  } catch (err) {
    console.error('CrossRef error:', err.message);
    return null;
  }
}

/**
 * Extrae índices únicos de marcadores IEEE [1], [2], … del texto.
 */
function extractCitationIndices(text) {
  const matches = Array.from(text.matchAll(/\[(\d+)\]/g))
                       .map(m => parseInt(m[1], 10));
  return [...new Set(matches)].sort((a, b) => a - b);
}

async function generateIntroduction(req, res) {
  const {
    title,
    description,
    objective,
    area_conocimiento,
    tipo_investigacion
  } = req.body;

  if (!title || !description || !objective) {
    return res.status(400).json({
      error: 'Faltan datos obligatorios (title, description, objective).'
    });
  }

  const prompt = `
Genera **exactamente** este JSON, sin texto adicional:
{
  "introduction": "<cuerpo>",
  "references": ["<APA1>", "<APA2>", /* … */]
}
Reglas para "introduction":
- Longitud 3900–4100 caracteres.
- Párrafos de 2–3 oraciones.
- Marcadores IEEE [1], [2], …  
- Tono académico-formal.
- Máximo 1000 tokens.
- Concluye con:
  “Este documento se organizó de la siguiente manera: en la sección 2 se abordó los trabajos relacionados, en la sección 3 se presentó la metodología, en la sección 4 se establecieron los resultados, en la sección 5 se desarrolló la discusión, en la sección 6 se describieron las limitaciones y en la sección 7 se detallaron las conclusiones.”

Reglas para "references":
- Devuelve una referencia APA 7 **real** por cada marcador IEEE.
- Orden numérico: la primera corresponde a [1], la segunda a [2], etc.

Datos:
Título: ${title}
Descripción: ${description}
Objetivo: ${objective}
Área de Conocimiento: ${area_conocimiento || 'No especificado'}
Tipo de Investigación: ${tipo_investigacion || 'No especificado'}
`;

  const messages = [
    { role: 'system', content: 'Eres un asistente experto en redacción académica.' },
    { role: 'user',   content: prompt }
  ];

  try {
    // 1) Generar con OpenAI
    let raw = await callOpenAI(messages, 'gpt-4o-mini', 0.3, 1000);
    raw = raw.trim();

    // 2) Eliminar fences Markdown si existen
    if (raw.startsWith('```')) {
      const m = raw.match(/```(?:json)?\s*([\s\S]*?)```$/i);
      if (m) raw = m[1].trim();
    }

    // 3) Extraer bloque JSON
    const jsonMatch = raw.match(/\{[\s\S]*\}$/);
    const jsonString = jsonMatch ? jsonMatch[0] : raw;

    // 4) Parsear JSON
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      console.error('Error parseando JSON de IA:', e.message);
      return res.status(500).json({
        error: 'La respuesta de IA no es un JSON válido.'
      });
    }

    const bodyText = parsed.introduction;

    // 5) Extraer índices de referencias
    const indices = extractCitationIndices(bodyText);

    // 6) Para cada índice, extraer snippet y buscar referencia real
    const realRefs = [];
    for (const idx of indices) {
      // Extraer la oración que contiene [idx]
      const re = new RegExp(`([^\\.]*?\\[${idx}\\][^\\.]*\\.)`);
      const m  = bodyText.match(re);
      const snippet = m ? m[1] : `${title} ${description.slice(0, 50)}`;

      const ref = await fetchRealReference(snippet);
      realRefs.push(ref || `Referencia no encontrada para [${idx}]`);
    }

    // 7) Devolver JSON con cuerpo y referencias reales
    return res.json({
      introduction: bodyText,
      references:   realRefs
    });
  } catch (err) {
    console.error('Error al generar introducción:', err.message);
    return res.status(500).json({
      error: 'Error interno al procesar la introducción con OpenAI.'
    });
  }
}

module.exports = { generateIntroduction };
