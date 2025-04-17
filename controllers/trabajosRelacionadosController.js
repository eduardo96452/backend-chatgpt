// controllers/trabajosRelacionadosController.js
const { callOpenAI } = require('../services/openaiService');

async function generateTrabajosRelacionados(req, res) {
  const { title, keywords, criterios_seleccion, description } = req.body;

  if (!title || !keywords || !criterios_seleccion) {
    return res.status(400).json({
      error: 'Faltan datos obligatorios en la solicitud (title, keywords, criterios_seleccion)'
    });
  }

  // Prompt actualizado
  const prompt = `
Redacta la sección de trabajos relacionados de un artículo científico utilizando los datos proporcionados.

— Título de la revisión: ${title}
— Palabras clave: ${keywords}
— Criterios de selección: ${criterios_seleccion}
— Descripción breve: ${description || 'No se proporcionó descripción adicional.'}

Lineamientos de redacción:

1. No incluyas encabezados (“Trabajos relacionados” ni similares).
2. Tono académico y formal, en párrafos cohesivos (sin listas ni viñetas numeradas).
3. Resume y analiza los estudios previos más relevantes, explicando cómo aportan al conocimiento del tema.
4. **Cada párrafo debe contener al menos una cita en formato APA** dentro del cuerpo del texto, por ejemplo: (Smith & Jones, 2021) o (Fernández et al., 2020).
   – Usa autores y años reales o verosímiles.
5. Al finalizar el análisis, agrega un bloque titulado “Referencias” que contenga la lista completa de las obras citadas, también en estilo APA.
   – Ordena las referencias alfabéticamente por apellido del primer autor.
6. Evita encabezados adicionales y no repitas citas ni números de sección.
`;

  try {
    const messages = [
      { role: 'system', content: 'Eres un asistente experto en redacción académica.' },
      { role: 'user', content: prompt }
    ];

    // 👉 Se fuerza explícitamente el modelo gpt-4o
    const generatedText = (await callOpenAI(messages, 'gpt-4o', 1.0)).trim();

    return res.status(200).json({ trabajos_relacionados: generatedText });
  } catch (error) {
    console.error('Error al llamar a OpenAI:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Error al procesar la solicitud con OpenAI' });
  }
}

module.exports = { generateTrabajosRelacionados };
