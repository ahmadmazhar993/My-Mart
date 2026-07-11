const express = require('express');

const router = express.Router();

const { isAuthenticated } = require('../auth/auth.service');
const { getCart, addToCart, removeFromCart, updateCartItem, clearCart } = require('./cart.service');
const { validateAddToCart, validateUpdateCartItem } = require('./cart.validation');

router.get('/', isAuthenticated, getCart);
router.post('/add', isAuthenticated, validateAddToCart, addToCart);
router.put('/items/:itemId', isAuthenticated, validateUpdateCartItem, updateCartItem);
router.delete('/remove/:itemId', isAuthenticated, removeFromCart);
router.post('/clear', isAuthenticated, clearCart);

module.exports = router;
