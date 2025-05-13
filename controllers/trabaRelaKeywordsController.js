// controllers/keywordsController.js
const { callOpenAI } = require('../services/openaiService');

const STOPWORDS = new Set([
  'que','de','la','el','y','en','los','se','con','para','del','las','por','a','su','lo','un','una','es','al','como',
  'the','and','of','in','on','for','with','to','a','an','is','are','be','by','this','that'
]);

function extractKeywordsLocal(text, n = 8) {
  return Array.from(new Set(
    text
      .toLowerCase()
      .replace(/[\d.,;:"“”()¿?¡!]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 4 && !STOPWORDS.has(w))
  ))
  .slice(0, n)
  .join(', ');
}

async function generatetrabaRelaKeywords(req, res) {
  const { text, n = 7 } = req.body;
  if (!text) return res.status(400).json({ error: 'Falta el texto para generar keywords.' });

  // Prompt para GPT
  const prompt = `Extrae las ${n} palabras clave más representativas del siguiente texto, separadas por comas:\n\n"${text}"`;

  try {
    const aiResp = await callOpenAI([
      { role: 'system', content: 'Eres un asistente que extrae palabras clave.' },
      { role: 'user', content: prompt }
    ], 'gpt-4o-mini', 0.3, 500);

    // Limpiamos comillas y saltos de línea, y acotamos a n
    const keywords = aiResp
      .replace(/["\r\n]/g, '')
      .split(',')
      .map(w => w.trim())
      .slice(0, n)
      .join(', ');

    return res.json({ keywords });
  } catch (err) {
    // Fallback local
    const keywords = extractKeywordsLocal(text, n);
    return res.json({ keywords });
  }
}


module.exports = { generatetrabaRelaKeywords };
