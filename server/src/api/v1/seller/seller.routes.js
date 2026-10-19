const express = require('express');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const { isAuthenticated, isApprovedSeller } = require('../auth/auth.service');
const { imageUpload } = require('./seller.uploads');
const service = require('./seller.service');
const products = require('./seller.products');
const inventory = require('./seller.inventory');
const orders = require('./seller.orders');
const finance = require('./seller.finance');
const analytics = require('./seller.analytics');
const returns = require('../returns/returns.service');

const applyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many applications. Please try again later.' },
});

// Public: the fee policy as currently configured.
router.get('/fee-policy', finance.getFeePolicy);

// Open to any signed-in user: applying, and checking one's own application.
router.get('/me', isAuthenticated, service.getMyStatus);
router.post('/apply', isAuthenticated, applyLimiter, service.apply);

// Everything below requires an *approved* seller. req.seller is derived from the
// session; no seller id is ever read from the request.
router.use(isAuthenticated, isApprovedSeller);

router.get('/dashboard', service.getDashboard);

router.get('/profile', service.getProfile);
router.put('/profile', service.updateProfile);
router.post('/profile/logo', imageUpload({ dirName: 'sellers', field: 'logo', maxCount: 1, maxSizeMb: 2 }), service.updateLogo);

router.get('/categories', products.listCategories);
router.post('/products/upload-images', imageUpload({ dirName: 'products', field: 'images', maxCount: 10, maxSizeMb: 6 }), products.uploadImages);
router.get('/products', products.listProducts);
router.post('/products', products.createProduct);
router.get('/products/:id', products.getProduct);
router.put('/products/:id', products.updateProduct);
router.post('/products/:id/submit', products.submitProduct);
router.post('/products/:id/publish', products.publishProduct);
router.post('/products/:id/unpublish', products.unpublishProduct);
router.delete('/products/:id', products.deleteProduct);

router.get('/inventory', inventory.listInventory);
router.put('/inventory/:id', inventory.updateStock);
router.get('/inventory/:id/movements', inventory.listMovements);

router.get('/orders', orders.listOrders);
router.get('/orders/:id', orders.getOrder);
router.put('/orders/:id/fulfillment', orders.updateFulfillment);

router.get('/earnings', finance.getEarnings);
router.get('/earnings/transactions', finance.listTransactions);
router.get('/earnings/ledger', finance.listLedger);
router.get('/payouts', finance.listPayouts);
router.post('/payouts', finance.requestPayout);

router.get('/analytics', analytics.getAnalytics);
router.get('/analytics/export.csv', analytics.exportCsv);

router.get('/returns', returns.sellerList);
router.get('/returns/:id', returns.sellerGet);
router.post('/returns/:id/messages', returns.sellerMessage);
router.post('/returns/:id/receive', returns.sellerReceive);

module.exports = router;
