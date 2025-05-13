// controllers/introductionKeywordsController.js
const { callOpenAI } = require('../services/openaiService');

// Stop-words mixtas en español e inglés
const STOPWORDS = new Set([
  'que','de','la','el','y','en','los','se','con','para','del','las',
  'por','a','su','lo','un','una','es','al','como',
  'the','and','of','in','on','for','with','to','a','an','is','are','be','by','this','that'
]);

// Extracción local de keywords
function extractKeywordsLocal(text, n = 10) {
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

// Controlador para extraer keywords de introducción
async function generateIntroductionKeywords(req, res) {
  const {
    title,
    description = '',
    objective,
    methodology,
    results_summary,
    discussion_summary,
    conclusions = '',
    research_questions = []
  } = req.body;

  // Validación básica
  if (!title || !objective) {
    return res
      .status(400)
      .json({ error: 'Faltan datos obligatorios: title u objective.' });
  }

  // 1) Combinar todo el texto para extraer keywords
  const parts = [
    title,
    description,
    objective,
    JSON.stringify(methodology),
    JSON.stringify(results_summary),
    discussion_summary.join(' '),
    conclusions,
    research_questions.join(' ')
  ];
  const combinedText = parts.join(' ');

  // 2) Intentar con GPT y si falla, fallback local
  const prompt = `Extrae las 10 palabras clave más representativas, separadas por comas, del siguiente texto:\n"${combinedText}"`;
  try {
    const aiResp = await callOpenAI([
      { role: 'system', content: 'Eres un asistente que extrae palabras clave.' },
      { role: 'user', content: prompt }
    ], 'gpt-4o-mini', 0.3, 500);

    // Limpiar y recortar a 8
    const keywords = aiResp
      .replace(/["\n]/g, '')
      .split(',')
      .map(w => w.trim())
      .slice(0, 10)
      .join(', ');

    return res.json({ keywords });
  } catch {
    const keywords = extractKeywordsLocal(combinedText, 10);
    return res.json({ keywords });
  }
}

module.exports = { generateIntroductionKeywords };
