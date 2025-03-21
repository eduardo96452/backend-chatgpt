// routes/conclusion.js
const express = require('express');
const router = express.Router();
const { generateConclusion } = require('../controllers/conclusionController');

// POST /api/generate-conclusion
router.post('/generate-conclusion', generateConclusion);

module.exports = router;
