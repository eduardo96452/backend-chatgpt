// controllers/metodologiaController.js
const { callOpenAI } = require('../services/openaiService');

async function generateMetodologia(req, res) {
  const {
    titulo_revision,
    objetivo,
    tipo_revision,
    frameworks,
    keywords,
    global_search,
    per_base_search,
    bibliografias,
    inclusion_criteria,
    exclusion_criteria
  } = req.body;

  if (!titulo_revision || !objetivo || !keywords || !global_search) {
    return res.status(400).json({ error: 'Faltan campos obligatorios en la solicitud.' });
  }

  const prompt = `
Genera exactamente el siguiente JSON (sin texto adicional):

{
  "enfoque_metodologico": "<Texto académico-formal (1 párrafo mínimo) explicando detalladamente qué es una Revisión Sistemática de Literatura (RSL), por qué es importante en este contexto y la razón específica de usar el protocolo ${tipo_revision}>",
  "fases_prisma": "<Explicación breve (1 párrafo completo) de cada fase del protocolo PRISMA: identificación, cribado e inclusión>>",
  "procedimiento_busqueda": "<breve descripción de procedimiento de búsqueda y matriz PICOC>>",
  "tabla_picos": "<tabla HTML completa con clases Bootstrap: <table class='table table-striped table-bordered'>, <tr>, <th>, <td>>>",
  "analisis_cadena_busqueda": "<breve explicación sobre cómo se creó la cadena de búsqueda global>>",
  "cadena_busqueda_global": "<cadena de búsqueda global proporcionada>>",
  "introduccion_bases_datos": "<texto introductorio breve sobre bases de datos utilizadas>>",
  "tabla_bases_datos": "<tabla HTML con clases Bootstrap: <table class='table table-striped table-bordered'>, <tr>, <th>, <td>>>",
  "tabla_cadenas_busqueda": "<tabla HTML con clases Bootstrap: <table class='table table-striped table-bordered'>, <tr>, <th>, <td>>>",
  "criterios_seleccion": "<Los criterios de selección se dividen en criterios de inclusión y exclusión.<br/>Los criterios de inclusión son:<br/>IC1: ${inclusion_criteria[0]};<br/>IC2: ${inclusion_criteria[1]}.<br/>Los criterios de exclusión son:<br/>EC1: ${exclusion_criteria[0]};<br/>EC2: ${exclusion_criteria[1]};<br/>EC3: ${exclusion_criteria[2]}.>",
  "proceso_cribado": "<texto breve explicando los pasos del proceso de cribado (título, resumen, texto completo) con referencia al diagrama PRISMA, indicando claramente cantidades exactas obtenidas de documentos por base de datos>>"
}

Instrucciones específicas para generar contenido:
- No inventes información; usa estrictamente los datos proporcionados aquí.
- Usa tablas HTML estilizadas con Bootstrap 5: cada etiqueta <table> debe llevar class='table table-striped table-bordered', sin estilos inline.
- quiero que cuando estes en el bloque de los criterios de inclusión y exclusión, uses el formato de lista numerada para cada uno de los criterios, y que los criterios de inclusión y exclusión estén separados por un salto de línea.
- Tono académico-formal y preciso, sin opiniones personales ni suposiciones.
- Máximo 6500 tokens.

Datos para generar el contenido:
Título de revisión: ${titulo_revision}
Objetivo: ${objetivo}
Tipo de revisión: ${tipo_revision}
Framework(s): ${frameworks.join(', ')}

Matriz PICOC:
${keywords.map(k => `
- Componente: ${k.componente}
- Palabra clave: ${k.palabra}
- Sinónimos: ${k.sinonimos.join(', ')}
`).join('\n')}

Criterios de inclusión:
${inclusion_criteria.map((c, i) => `IC${i + 1}: ${c}`).join('\n')}

Criterios de exclusión:
${exclusion_criteria.map((c, i) => `EC${i + 1}: ${c}`).join('\n')}

Bases bibliográficas utilizadas:
${bibliografias.map(b => `- ${b.nombre}: ${b.url}`).join('\n')}

Cadena global proporcionada:
${global_search}

Cadenas por base de datos:
${per_base_search.map(b => `- ${b.fuente}: ${b.cadena}`).join('\n')}

Resultados del proceso de búsqueda (documentos obtenidos por base de datos):
${bibliografias.map(b => `- ${b.nombre}: [indicar número exacto de documentos obtenidos aquí]`).join('\n')}
`;

  try {
    const messages = [
      { role: 'system', content: 'Eres un asistente experto en redacción académica, generación de metodologías y tablas HTML basadas en datos proporcionados por el usuario, sin inventar información.' },
      { role: 'user', content: prompt }
    ];

    let aiResponse = await callOpenAI(messages, 'gpt-4o-mini', 0.3, 6500);
    aiResponse = aiResponse.replace(/^```json|```$/g, '').trim();

    const metodologiaJson = JSON.parse(aiResponse);
    // Corregido: usar la variable correcta metodologiaJson
    res.status(200).json(metodologiaJson);
  } catch (error) {
    console.error('Error generando Metodología:', error);
    res.status(500).json({ error: 'Error interno generando metodología.' });
  }
}

module.exports = { generateMetodologia };
