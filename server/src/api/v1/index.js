const express = require('express');

const router = express.Router();

// Import routes
const auth = require('./auth/auth.routes');
const user = require('./user/user.routes');
const product = require('./products/products.routes');
const order = require('./orders/orders.routes');
const category = require('./categories/categories.routes');
const seller = require('./sellers/sellers.routes');
const sellerPortal = require('./seller/seller.routes');
const returnsRoutes = require('./returns/returns.routes');
const adminRoutes = require('./admin/admin.routes');
const eventsRoutes = require('./events/events.routes');
const cart = require('./cart/cart.routes');
const contact = require('./contact/contact.routes');
const reports = require('./reports/reports.routes');
const receipts = require('./receipts/receipts.routes');

// Mount routes
router.use('/auth', auth);
router.use('/user', user);
router.use('/products', product);
router.use('/orders', order);
router.use('/categories', category);
router.use('/sellers', seller); // admin seller management
router.use('/seller', sellerPortal); // seller self-service
router.use('/returns', returnsRoutes); // customer returns
router.use('/admin', adminRoutes); // admin finance + returns
router.use('/events', eventsRoutes); // scoped live updates (SSE)
router.use('/cart', cart);
router.use('/contact', contact);
router.use('/reports', reports);
router.use('/receipts', receipts);

module.exports = router;
