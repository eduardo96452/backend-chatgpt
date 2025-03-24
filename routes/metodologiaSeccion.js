// routes.js
const express = require('express');
const router = express.Router();

// Importas tu controlador
const { generateMetodologia } = require('../controllers/metodologiaController');

// Definir la ruta para generar Metodología con IA
router.post('/generate-metodologia', generateMetodologia);

module.exports = router;