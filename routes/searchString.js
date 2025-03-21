// routes/searchString.js
const express = require('express');
const router = express.Router();
const { generateSearchString } = require('../controllers/searchStringController');

// Definir el endpoint POST para generar la cadena de búsqueda
router.post('/generate-search-string', generateSearchString);

module.exports = router;
