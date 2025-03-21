// routes/discussion.js
const express = require('express');
const router = express.Router();
const { generateDiscussion } = require('../controllers/discussionController');

// POST /api/generate-discusion
router.post('/generate-discusion', generateDiscussion);

module.exports = router;
