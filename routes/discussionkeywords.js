const express = require('express');
const { discussionKeywordsController } = require('../controllers/discussionKeywordsController');

const router = express.Router();

router.post('/generate-discussion-keywords', discussionKeywordsController);

module.exports = router;

