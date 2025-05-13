const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3005;
const objectivesRoutes = require('./routes/objectives');
const methodologyRoutes = require('./routes/methodology');
const researchQuestionsRoutes = require('./routes/researchQuestions');
const keywordsRoutes = require('./routes/keywords');
const searchStringRoutes = require('./routes/searchString');
const criteriaRoutes = require('./routes/criteria');
const qualityQuestionsRoutes = require('./routes/qualityQuestions');
const dataExtractionRoutes = require('./routes/dataExtraction');
const suggestionsRoutes = require('./routes/suggestions');
const introductionRoutes = require('./routes/introduction');
const introductionKeywordsRoutes = require('./routes/introductionkeywords');
const trabajosRelacionadosRoutes = require('./routes/trabajosRelacionados');
const resultadosRoutes = require('./routes/resultados');
const discussionRoutes = require('./routes/discussion');
const discussionkeywordsRoutes = require('./routes/discussionkeywords');
const limitacionesRoutes = require('./routes/limitaciones');
const conclusionRoutes = require('./routes/conclusion');
const resumenRoutes = require('./routes/resumen');
const metodologiaRoutes = require('./routes/metodologiaSeccion');
const contactRoutes = require('./routes/contact');
const trabajosRelacionadosKeywordsRoutes = require('./routes/trabaRelaKeywords');

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Aquí ya debe existir la constante objectivesRoutes
app.use('/api', objectivesRoutes);
app.use('/api', methodologyRoutes);
app.use('/api', researchQuestionsRoutes);
app.use('/api', keywordsRoutes);
app.use('/api', searchStringRoutes);
app.use('/api', criteriaRoutes);
app.use('/api', qualityQuestionsRoutes);
app.use('/api', dataExtractionRoutes);
app.use('/api', suggestionsRoutes);
app.use('/api', introductionRoutes);
app.use('/api', introductionKeywordsRoutes);
app.use('/api', trabajosRelacionadosRoutes);
app.use('/api', resultadosRoutes);
app.use('/api', discussionRoutes);
app.use('/api', discussionkeywordsRoutes);
app.use('/api', limitacionesRoutes);
app.use('/api', conclusionRoutes);
app.use('/api', resumenRoutes);
app.use('/api', metodologiaRoutes);
app.use('/api', contactRoutes);
app.use('/api', trabajosRelacionadosKeywordsRoutes);

// Inicia el servidor en localhost:3000
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
