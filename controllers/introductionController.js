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
• Longitud total 3 900 – 4 100 caracteres (incluyendo espacios).
• Divide en **párrafos**: cada párrafo debe contener **2 – 3 oraciones**.
• No utilices encabezados.
• Cada párrafo debe incluir **al menos un marcador IEEE** único y ascendente: [1], [2], …
• Tono académico-formal.
• Concluye con el párrafo EXACTO:

  “Este documento se organizó de la siguiente manera: en la sección 2 se abordó los trabajos relacionados, en la sección 3 se presentó la metodología, en la sección 4 se establecieron los resultados, en la sección 5 se desarrolló la discusión, en la sección 6 se describieron las limitaciones y en la sección 7 se detallaron las conclusiones.”

Reglas para "references":
• Devuelve 4 – 6 referencias **reales** en formato **APA 7**.

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
    let parsed;
    for (let attempt = 0; attempt < 3; attempt++) {
      const raw = await callOpenAI(messages);
      try { parsed = JSON.parse(raw); } catch { continue; }

      const len = parsed.introduction.length;
      if (len >= 3900 && len <= 4100) break;   // OK
      parsed = undefined;                      // fuerza reintento
    }
    if (!parsed) {
      return res.status(502).json({ error: 'OpenAI no respetó el formato tras 3 intentos.' });
    }

    /* Devuelve referencias unidas por <br> para el div editable */
    res.json({
      introduction: parsed.introduction,
      references  : parsed.references.join('<br>')
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al generar introducción' });
  }
}

module.exports = { generateIntroduction };
