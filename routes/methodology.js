// routes/metodologia.js
const express = require('express');
const router  = express.Router();
const { generateMethodologyStructure } = require('../controllers/methodologyController');

// Ruta nueva que use exactamente /api/methodology-structure
router.post('/methodology-structure', generateMethodologyStructure);

module.exports = router;
