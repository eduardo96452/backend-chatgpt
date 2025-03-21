// routes/methodology.js
const express = require('express');
const router = express.Router();
const { generateMethodologyStructure } = require('../controllers/methodologyController');

// POST /api/methodology-structure
router.post('/methodology-structure', generateMethodologyStructure);

module.exports = router;
