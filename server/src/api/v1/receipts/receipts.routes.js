const express = require('express');
const router = express.Router();

const { isAuthenticated, isAdmin } = require('../auth/auth.service');
const { getReceiptByOrderId, getPublicReceiptByInvoice } = require('./receipts.service');

// Authenticated API to fetch receipt JSON by order id
router.get('/order/:id', isAuthenticated, getReceiptByOrderId);

// Public printable receipt by invoice number (no auth) - used for QR scans
router.get('/public/:invoice', getPublicReceiptByInvoice);

module.exports = router;
