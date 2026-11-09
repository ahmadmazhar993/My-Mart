const express = require('express');

const router = express.Router();

const { isAuthenticated, isAdmin } = require('../auth/auth.service');
const { salesSummary } = require('./reports.service');

router.get('/sales', isAuthenticated, isAdmin, salesSummary);

module.exports = router;
