// routes/resultados.js
const express = require('express');
const router = express.Router();
const { generateResultados } = require('../controllers/resultadosController');

// POST /api/generate-resultados
router.post('/generate-resultados', generateResultados);

module.exports = router;
