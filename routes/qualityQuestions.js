// routes/qualityQuestions.js
const express = require('express');
const router = express.Router();
const { generateQualityQuestions } = require('../controllers/qualityQuestionsController');

router.post('/generate-quality-questions', generateQualityQuestions);

module.exports = router;
