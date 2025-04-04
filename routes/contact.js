// routes/contact.js
const express = require('express');
const router = express.Router();
const { sendContactMessage } = require('../controllers/contactController');

// POST /api/contact
router.post('/contact', sendContactMessage);

module.exports = router;
