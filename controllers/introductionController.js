// controllers/introductionController.js
const { callOpenAI } = require('../services/openaiService');

async function generateIntroduction(req, res) {
  const {
    title, description, objective,
    area_conocimiento, tipo_investigacion
  } = req.body;

  /* ── PROMPT ─────────────────────────────────────────────── */
  const prompt = `
Genera **exactamente** el siguiente JSON, sin texto adicional:

{
  "introduction": "<cuerpo>",
  "references": [
    "<Referencia APA 1>",
    "<Referencia APA 2>",
    "<Referencia APA 3>",
    "<Referencia APA 4>"
  ]
}

Reglas para "introduction":
 • Longitud total 3 900 o 4 100 caracteres.
 • Divide en párrafos (2 o 3 oraciones c/u).
 • Incluye marcadores IEEE [1], [2], … únicos y ascendentes.
 • Tono académico-formal.
 • **Limita tu salida a un máximo de 1 000 tokens.**
 • Concluye con el párrafo:
   “Este documento se organizó de la siguiente manera: en la sección 2 se abordó los trabajos relacionados, en la sección 3 se presentó la metodología, en la sección 4 se establecieron los resultados, en la sección 5 se desarrolló la discusión, en la sección 6 se describieron las limitaciones y en la sección 7 se detallaron las conclusiones.”

Reglas para "references":
• Devuelve 5 o 6 referencias **reales** en formato **APA 7**.

Datos para redactar:
Título: ${title}
Descripción: ${description}
Objetivo: ${objective}
Área de conocimiento: ${area_conocimiento || 'No especificado'}
Tipo de investigación: ${tipo_investigacion || 'No especificado'}
`;

  /* ── LLAMADA A OPENAI ───────────────────────────────────── */
  const messages = [
    { role: 'system', content: 'Eres un asistente experto en redacción académica.' },
    { role: 'user',   content: prompt }
  ];

  try {
    // Llama AL WRAPPER, no a “openai”
    const aiRaw = await callOpenAI(
      messages,
      'gpt-4-turbo',  // modelo
      0.3,            // temperature
      1000            // max_tokens
    );

    // Parseo y validaciones…
    const parsed = JSON.parse(aiRaw);
    return res.json({
      introduction: parsed.introduction,
      references  : parsed.references.join('<br>')
    });
  } catch (err) {
    console.error('Error al generar introducción:', err);
    return res.status(500).json({ error: 'Error al procesar la solicitud con OpenAI' });
  }
}

module.exports = { generateIntroduction };
