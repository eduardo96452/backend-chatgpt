// routes/introduction.js
const express = require('express');
const router  = express.Router();

// IMPORT correcto del controlador
const { generateIntroduction } = require('../controllers/introductionController');

// Aquí GENERATEINTRODUCTION debe ser una función, no undefined
router.post('/generate-introduction', generateIntroduction);

module.exports = router;