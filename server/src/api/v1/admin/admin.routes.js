const express = require('express');

const router = express.Router();

const { isAuthenticated, isAdmin } = require('../auth/auth.service');
const finance = require('./finance.service');
const returns = require('../returns/returns.service');

// Every route here is admin-only.
router.use(isAuthenticated, isAdmin);

router.get('/finance/commission', finance.getCommissionSettings);
router.post('/finance/commission', finance.setCommissionRate);
router.get('/finance/overview', finance.overview);
router.get('/finance/commissions', finance.commissionReport);
router.get('/finance/sellers', finance.listSellerBalances);
router.get('/finance/sellers/:id', finance.getSellerFinance);
router.get('/finance/payouts', finance.listPayouts);
router.post('/finance/payouts/:id/complete', finance.completePayout);
router.post('/finance/payouts/:id/reject', finance.rejectPayout);
router.post('/finance/payouts/:id/fail', finance.failPayout);

router.get('/returns/settings', returns.getSettings);
router.put('/returns/settings', returns.setReturnWindow);
router.get('/returns', returns.adminList);
router.get('/returns/:id', returns.adminGet);
router.post('/returns/:id/messages', returns.adminMessage);
router.post('/returns/:id/approve', returns.approve);
router.post('/returns/:id/reject', returns.reject);
router.post('/returns/:id/refund', returns.adminRefund);

module.exports = router;
