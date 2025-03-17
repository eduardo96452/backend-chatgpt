// routes/objectives.js
const express = require('express');
const router = express.Router();
const { generateObjective } = require('../controllers/objectivesController');

// POST /api/generate-objetive
router.post('/generate-objetive', generateObjective);

module.exports = router;
