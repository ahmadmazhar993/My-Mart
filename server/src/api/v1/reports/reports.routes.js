const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../auth/auth.service');
const { salesSummary } = require('./reports.service');

// Marketplace-wide revenue, cost and profit: admin only.
router.get('/sales', isAuthenticated, isAdmin, salesSummary);

module.exports = router;
