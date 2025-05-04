// routes/resumen.js
const express = require('express');
const router = express.Router();
const { generateResumen } = require('../controllers/resumenController');

router.post('/generate-resumen', generateResumen);

module.exports = router;