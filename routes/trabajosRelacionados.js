// routes/trabajosRelacionados.js
const express = require('express');
const router = express.Router();
const { generateTrabajosRelacionados } = require('../controllers/trabajosRelacionadosController');

// Define el endpoint POST para generar Trabajos Relacionados
router.post('/generate-trabajos-relacionados', generateTrabajosRelacionados);

module.exports = router;
