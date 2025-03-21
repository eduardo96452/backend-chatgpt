// routes/referencias.js
const express = require('express');
const router = express.Router();
const { generateReferencias } = require('../controllers/referenciasController');

// POST /api/generate-referencias
router.post('/generate-referencias', generateReferencias);

module.exports = router;
