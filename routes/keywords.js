// routes/keywords.js
const express = require('express');
const router = express.Router();
const { generateKeywords } = require('../controllers/keywordsController');

// POST /api/generate-keywords
router.post('/generate-keywords', generateKeywords);

module.exports = router;
