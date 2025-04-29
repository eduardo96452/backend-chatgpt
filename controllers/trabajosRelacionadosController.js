// controllers/trabajosRelacionadosController.js
const { callOpenAI } = require('../services/openaiService');
const axios = require('axios');

async function fetchRealReference(query) {
  try {
    const resp = await axios.get('https://api.crossref.org/works', {
      params: { query, rows: 1 }
    });
    const item = resp.data.message.items[0];
    if (!item) return null;

    const authors = (item.author || [])
      .map(a => {
        const family = a.family || '';
        const givenInitial = a.given ? a.given.trim().charAt(0) + '.' : '';
        return givenInitial ? `${family}, ${givenInitial}` : family;
      })
      .join('; ');

    const year    = item.published?.['date-parts']?.[0]?.[0] || '';
    const title   = Array.isArray(item.title) ? item.title[0] : item.title;
    const journal = Array.isArray(item['container-title']) ? item['container-title'][0] : item['container-title'];
    const volume  = item.volume || '';
    const issue   = item.issue  ? `(${item.issue})` : '';
    const pages   = item.page   ? `, ${item.page}` : '';

    return `${authors} (${year}). ${title}. *${journal}*, ${volume}${issue}${pages}.`;
  } catch (err) {
    console.error('CrossRef error:', err.message);
    return null;
  }
}

async function generateTrabajosRelacionados(req, res) {
  const { title, keywords, criterios_seleccion, description } = req.body;
  if (!title || !keywords || !criterios_seleccion) {
    return res.status(400).json({ error: 'Faltan datos obligatorios.' });
  }

  const prompt = `
Genera **exactamente** este JSON:

{
  "trabajos_relacionados": "<cuerpo con marcadores [1],[2],…>",
  "references": []
}

Reglas para "trabajos_relacionados":
• 7000–8000 caracteres. Párrafos de 2–3 oraciones.  
• Marcadores IEEE [1], [2], …  
• Tono académico-formal.  
• Máximo 3000 tokens.

Reglas para "references":
• Una referencia APA 7 **real** por cada marcador.  
• La entrada #1 corresponde a [1], #2 a [2], etc.

Datos:
Título: ${title}
Palabras clave: ${keywords}
Criterios: ${criterios_seleccion}
Descripción: ${description||'N/A'}
`;

  const messages = [
    { role: 'system', content: 'Eres un asistente experto en redacción académica.' },
    { role: 'user',   content: prompt }
  ];

  try {
    // 1) Genera el cuerpo
    let raw = await callOpenAI(messages, 'gpt-4o-mini', 0.3, 3000);
    raw = raw.trim().replace(/^```(?:json)?|```$/g, '');

    // 2) Extrae JSON
    const jsonMatch = raw.match(/\{[\s\S]*\}$/);
    const jsonString = jsonMatch ? jsonMatch[0] : raw;
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      return res.json({ trabajos_relacionados: raw, references: [] });
    }

    const bodyText = parsed.trabajos_relacionados;

    // 3) Identifica marcadores y ordena
    const markers = Array.from(bodyText.matchAll(/\[(\d+)\]/g)).map(m=>+m[1]);
    const unique = [...new Set(markers)].sort((a,b)=>a-b);

    // 4) Para cada marcador extrae la frase y busca referencia real
    const realRefs = [];
    for (const index of unique) {
      // extraer frase que contiene el marcador [index]
      const regex = new RegExp(`([^\\.]*?\\[${index}\\][^\\.]*\\.)`, 'i');
      const match = bodyText.match(regex);
      const snippet = match ? match[1] : `${title} ${keywords.split(',')[0]}`;

      const ref = await fetchRealReference(snippet);
      realRefs.push(ref || `Referencia no encontrada para [${index}]`);
    }

    return res.json({
      trabajos_relacionados: bodyText,
      references           : realRefs
    });

  } catch (err) {
    console.error('Error en generateTrabajosRelacionados:', err.message);
    return res.status(500).json({ error: 'Error interno al generar la sección.' });
  }
}

module.exports = { generateTrabajosRelacionados };
