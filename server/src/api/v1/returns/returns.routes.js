const express = require('express');

const router = express.Router();

const { isAuthenticated } = require('../auth/auth.service');
const { imageUpload } = require('../seller/seller.uploads');
const returns = require('./returns.service');

// Customer-facing returns. Everything is scoped to the signed-in user's own orders.
router.use(isAuthenticated);
router.post('/upload-evidence', imageUpload({ dirName: 'returns', field: 'images', maxCount: 5, maxSizeMb: 5 }), returns.uploadEvidence);
router.post('/', returns.createReturn);
router.get('/mine', returns.listMyReturns);
router.get('/order/:orderId', returns.listOrderReturns);
router.get('/:id', returns.getMyReturn);
router.post('/:id/messages', returns.customerMessage);
router.post('/:id/cancel', returns.cancelMyReturn);

module.exports = router;
