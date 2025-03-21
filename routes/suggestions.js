// routes/suggestions.js
const express = require('express');
const router = express.Router();
const { generateExtractionSuggestions } = require('../controllers/suggestionsController');

// POST /api/generate-extraction-suggestions
router.post('/generate-extraction-suggestions', generateExtractionSuggestions);

module.exports = router;
