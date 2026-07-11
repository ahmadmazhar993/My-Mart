const express = require('express');

const router = express.Router();

// Import routes
const auth = require('./auth/auth.routes');
const user = require('./user/user.routes');
const product = require('./products/products.routes');
const order = require('./orders/orders.routes');
const category = require('./categories/categories.routes');
const seller = require('./sellers/sellers.routes');
const cart = require('./cart/cart.routes');
const contact = require('./contact/contact.routes');

// Mount routes
router.use('/auth', auth);
router.use('/user', user);
router.use('/products', product);
router.use('/orders', order);
router.use('/categories', category);
router.use('/sellers', seller);
router.use('/cart', cart);
router.use('/contact', contact);

module.exports = router;
