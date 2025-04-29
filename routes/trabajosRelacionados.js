// routes/trabajosRelacionados.js
const express = require('express');
const router  = express.Router();

// Asegúrate de que esta ruta apunta donde realmente está tu controlador:
const { generateTrabajosRelacionados } = require('../controllers/trabajosRelacionadosController');

// Ahora generateTrabajosRelacionados debe ser una función, no undefined
router.post('/generate-trabajos-relacionados', generateTrabajosRelacionados);

module.exports = router;