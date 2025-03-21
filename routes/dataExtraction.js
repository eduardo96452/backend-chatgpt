// routes/dataExtraction.js
const express = require('express');
const router = express.Router();
const { generateDataExtractionQuestions } = require('../controllers/dataExtractionController');

// POST /api/generate-data-extraction-questions
router.post('/generate-data-extraction-questions', generateDataExtractionQuestions);

module.exports = router;
