const express = require('express');
const { record, summary } = require('../controllers/progress.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/',    requireAuth, record);
router.get('/me',   requireAuth, summary);

module.exports = router;
