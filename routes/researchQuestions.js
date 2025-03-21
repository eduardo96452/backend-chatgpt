// routes/researchQuestions.js
const express = require('express');
const router = express.Router();
const { generateResearchQuestions } = require('../controllers/researchQuestionsController');

// Define el endpoint POST para generar preguntas de investigación
router.post('/research-questions', generateResearchQuestions);

module.exports = router;
