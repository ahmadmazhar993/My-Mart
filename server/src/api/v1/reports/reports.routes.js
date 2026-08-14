const express = require('express');
const router = express.Router();
const { salesSummary } = require('./reports.service');

router.get('/sales', salesSummary);

module.exports = router;
