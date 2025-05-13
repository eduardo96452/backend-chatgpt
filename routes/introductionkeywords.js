// routes/introduction.js
const express = require('express');
const router  = express.Router();

// IMPORT correcto del controlador
const { generateIntroductionKeywords } = require('../controllers/introductionKeywordsController');

// Aquí GENERATEINTRODUCTION debe ser una función, no undefined
router.post('/generate-introduction-keywords', generateIntroductionKeywords);

module.exports = router;