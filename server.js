const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const objectivesRoutes = require('./routes/objectives');
const methodologyRoutes = require('./routes/methodology');
const researchQuestionsRoutes = require('./routes/researchQuestions');
const keywordsRoutes = require('./routes/keywords');
const searchStringRoutes = require('./routes/searchString');
const criteriaRoutes = require('./routes/criteria');
const dataExtractionRoutes = require('./routes/dataExtraction');
const suggestionsRoutes = require('./routes/suggestions');
const introductionRoutes = require('./routes/introduction');
const trabajosRelacionadosRoutes = require('./routes/trabajosRelacionados');
const resultadosRoutes = require('./routes/resultados');
const discussionRoutes = require('./routes/discussion');
const limitacionesRoutes = require('./routes/limitaciones');
const conclusionRoutes = require('./routes/conclusion');
const referenciasRoutes = require('./routes/referencias');

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
app.use('/api', dataExtractionRoutes);
app.use('/api', suggestionsRoutes);
app.use('/api', introductionRoutes);
app.use('/api', trabajosRelacionadosRoutes);
app.use('/api', resultadosRoutes);
app.use('/api', discussionRoutes);
app.use('/api', limitacionesRoutes);
app.use('/api', conclusionRoutes);
app.use('/api', referenciasRoutes);


// Inicia el servidor en localhost:3000
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
