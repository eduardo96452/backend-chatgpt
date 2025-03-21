// routes/limitaciones.js
const express = require('express');
const router = express.Router();
const { generateLimitaciones } = require('../controllers/limitacionesController');

// POST /api/generate-limitaciones
router.post('/generate-limitaciones', generateLimitaciones);

module.exports = router;
