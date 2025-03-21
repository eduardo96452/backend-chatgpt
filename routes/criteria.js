// routes/criteria.js
const express = require('express');
const router = express.Router();
const { generateCriteria } = require('../controllers/criteriaController');

// POST /api/generate-criteria
router.post('/generate-criteria', generateCriteria);

module.exports = router;
