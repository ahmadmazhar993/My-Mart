const express = require('express');

const router = express.Router();

const { isAuthenticated, isAdmin } = require('../auth/auth.service');
const {
  listOrders,
  createOrder,
  getOrderById,
  updateOrderStatus,
  submitPaymentProof,
  uploadPaymentProofMiddleware,
} = require('./orders.service');
const { validateCreateOrder, validateUpdateOrderStatus } = require('./orders.validation');

router.get('/', isAuthenticated, listOrders);
router.get('/:id', isAuthenticated, getOrderById);
router.post('/', isAuthenticated, validateCreateOrder, createOrder);
router.post('/checkout', isAuthenticated, validateCreateOrder, createOrder);
router.post('/:id/payment-proof', isAuthenticated, uploadPaymentProofMiddleware, submitPaymentProof);
router.put('/:id', isAuthenticated, validateUpdateOrderStatus, updateOrderStatus);

module.exports = router;
