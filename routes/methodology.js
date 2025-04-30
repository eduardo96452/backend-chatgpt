// routes/metodologia.js
const express = require('express');
const router = express.Router();
const { generateMetodologia } = require('../controllers/metodologiaController');

// Esto coincide con tu componente
router.post('/generate-metodologia', generateMetodologia);

module.exports = router;
