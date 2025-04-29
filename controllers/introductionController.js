// controllers/introductionController.js
const { callOpenAI } = require('../services/openaiService');

async function generateIntroduction(req, res) {
  const { title, description, objective, area_conocimiento, tipo_investigacion } = req.body;

  const prompt = `
Genera **exactamente** el siguiente JSON, sin texto adicional:

{
  "introduction": "<párrafos (≈3 950–4 100 caracteres) con indicadores numéricos IEEE [1]…>",
  "references": [
    "<Referencia APA 7 verdadera 1>",
    "<Referencia APA 7 verdadera 2>",
    "<Referencia APA 7 verdadera 3>"
  ]
}

Reglas para "introduction":
- Tono académico-formal, prosa continua, sin encabezados.
- Cada párrafo incluye al menos un marcador [n] único y ascendente.
- Termina con: "Este documento se organizó de la siguiente manera: …".

Reglas para "references":
- De 3 a 6 referencias reales y verificables, en formato APA 7.
- Longitud total (intro + refs) ≈ 3 950 – 4 150 caracteres.

Datos del estudio:
Título: ${title}
Descripción: ${description}
Objetivo: ${objective}
Área de Conocimiento: ${area_conocimiento}
Tipo de Investigación: ${tipo_investigacion}
`;

  const messages = [
    { role: 'system', content: 'Eres un asistente experto en redacción académica.' },
    { role: 'user',   content: prompt }
  ];

  try {
    const raw = await callOpenAI(messages);
    const parsed = JSON.parse(raw);
    res.json({
      introduction: parsed.introduction,
      references  : parsed.references.join('<br>')   // devuelve como bloque <br>
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'OpenAI format error.' });
  }
}

module.exports = { generateIntroduction };