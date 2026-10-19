const express = require('express');

const router = express.Router();

const { isAuthenticated, isAdmin } = require('../auth/auth.service');
const service = require('./sellers.service');

// Admin only. Seller self-service lives under /seller (singular).
router.use(isAuthenticated, isAdmin);

// Product review queue (declared before /:id so "products" is not read as an id).
router.get('/products/review', service.listReviewQueue);
router.post('/products/:productId/approve', service.approveProduct);
router.post('/products/:productId/reject', service.rejectProduct);

router.get('/', service.listSellers);
router.get('/:id', service.getSellerById);
router.put('/:id', service.updateSeller);
router.post('/:id/approve', service.approveSeller);
router.post('/:id/reject', service.rejectSeller);
router.post('/:id/suspend', service.suspendSeller);
router.post('/:id/reactivate', service.reactivateSeller);
router.get('/:id/orders', service.listSellerOrders);
router.get('/:id/products', service.listSellerProducts);

module.exports = router;
