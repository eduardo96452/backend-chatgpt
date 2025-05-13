// controllers/discussionKeywordsController.js
const { callOpenAI } = require('../services/openaiService');

const STOPWORDS = new Set([
  'que','de','la','el','y','en','los','se','con','para','del','las','por','a','su','lo','un','una','es','al','como',
  'the','and','of','in','on','for','with','to','a','an','is','are','be','by','this','that'
]);

// Extracción local de keywords
function extractKeywordsLocal(text, n = 8) {
  return Array.from(new Set(
    text.toLowerCase()
      .replace(/[\d.,;:"“”()¿?¡!]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 4 && !STOPWORDS.has(w))
  )).slice(0, n).join(', ');
}

// Controlador de generación de keywords para discusión
async function discussionKeywordsController(req, res) {
  const {
    reflexion_inicial,
    referencias,
    n = 8,
    ...otrasSecciones
  } = req.body;

  // Validación básica
  if (!Array.isArray(reflexion_inicial) || !Array.isArray(referencias)) {
    return res.status(400).json({
      error: 'Debes enviar "reflexion_inicial" y "referencias" como arrays de strings.'
    });
  }

  // 1) Combinar todo el contenido en un solo texto
  const partes = [
    ...reflexion_inicial,
    ...referencias,
    // aplanamos cualquier otra sección (preguntas/respuestas)
    ...Object.values(otrasSecciones).flatMap(val =>
      Array.isArray(val) ? val : [String(val)]
    )
  ];
  const combinedText = partes.join(' ');

  // 2) Preparar prompt
  const prompt = `Extrae las ${n} palabras clave más representativas, separadas por comas, del siguiente texto:\n"${combinedText}"`;

  // 3) Intentar con GPT, fallback a local
  try {
    const aiResp = await callOpenAI([
      { role: 'system', content: 'Eres un asistente que extrae palabras clave.' },
      { role: 'user', content: prompt }
    ], 'gpt-4o-mini', 0.3, 500);

    // Limpiar y recortar a n
    const keywords = aiResp
      .replace(/["\n]/g, '')
      .split(',')
      .map(w => w.trim())
      .slice(0, n)
      .join(', ');

    return res.json({ keywords });
  } catch {
    const keywords = extractKeywordsLocal(combinedText, n);
    return res.json({ keywords });
  }
}

module.exports = { discussionKeywordsController };
