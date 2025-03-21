// routes/introduction.js
const express = require('express');
const router = express.Router();
const { generateIntroduction } = require('../controllers/introductionController');

// Define el endpoint POST para generar la Introducción
router.post('/generate-introduction', generateIntroduction);

module.exports = router;
