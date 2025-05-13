const express = require('express');
const { generatetrabaRelaKeywords } = require('../controllers/trabaRelaKeywordsController');

const router = express.Router();

router.post('/trabaRelaKeywords', generatetrabaRelaKeywords);

module.exports = router;
