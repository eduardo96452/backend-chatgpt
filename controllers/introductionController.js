const { callOpenAI } = require('../services/openaiService');

async function generateIntroduction(req, res) {
  const {
    title, description, objective,
    area_conocimiento, tipo_investigacion
  } = req.body;

  // (aquí tu prompt como antes, con instrucciones de tokens, párrafos, etc.)
  const prompt = `
Genera **exactamente** el siguiente JSON, sin texto adicional:
{
  "introduction": "<cuerpo>",
  "references": ["<APA1>", "<APA2>", "<APA3>", "<APA4>"]
}
Reglas para "introduction":
- Longitud 3 900–4 100 caracteres.
- Párrafos de 2–3 oraciones.
- Marcadores IEEE [1], [2],…
- Tono académico-formal.
- Máximo 1 000 tokens.
- Concluye con el párrafo:
  “Este documento se organizó de la siguiente manera: en la sección 2… sección 7…”
Reglas para "references":
- 4–6 referencias reales en APA 7.
Datos:
Título: ${title}
Descripción: ${description}
Objetivo: ${objective}
Área: ${area_conocimiento || 'No especificado'}
Tipo de investigación: ${tipo_investigacion || 'No especificado'}
`;

  const messages = [
    { role: 'system', content: 'Eres un asistente experto en redacción académica.' },
    { role: 'user',   content: prompt }
  ];

  try {
    // 1) Llamada única a OpenAI
    const aiRaw = await callOpenAI(messages, 'gpt-4o-mini', 0.3, 1000);

    // 2) Limpieza de fences ```json … ```
    let cleaned = aiRaw.trim();
    if (cleaned.startsWith('```')) {
      const m = cleaned.match(/```(?:json)?\s*([\s\S]*?)```$/i);
      if (m) cleaned = m[1].trim();
    }

    // 3) Intento de parseo
    const parsed = JSON.parse(cleaned);

    // 4) Respuesta al cliente
    return res.json({
      introduction: parsed.introduction,
      references  : parsed.references.join('<br>')
    });

  } catch (err) {
    console.error('Error al generar introducción:', err);
    // Si JSON.parse falla o callOpenAI arroja, devolvemos 500 genérico
    return res.status(500).json({
      error: 'Error al procesar la introducción con OpenAI'
    });
  }
}

module.exports = { generateIntroduction };
