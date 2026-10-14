const express = require('express');

const router = express.Router();

const {
  listProducts,
  listProductsAdmin,
  getProductById,
  getProductByIdAdmin,
  getProductReviews,
  createProductReview,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImages,
  checkProductPurchased,
  googleProductFeed,
} = require('./products.service');
const { validateCreateProduct, validateUpdateProduct } = require('./products.validation');
const { isAuthenticated, isAdmin } = require('../auth/auth.service');

// ---------------------------------------------------------------------------
// Admin reads (full data, includes purchase_price, stock_quantity, can_delete)
// These MUST be declared before '/:identifier', otherwise "admin" would be
// treated as a product slug.
// ---------------------------------------------------------------------------
router.get('/admin', isAuthenticated, isAdmin, listProductsAdmin);
router.get('/admin/:identifier', isAuthenticated, isAdmin, getProductByIdAdmin);

// ---------------------------------------------------------------------------
// Public (safe data only)
// ---------------------------------------------------------------------------
router.get('/', listProducts);
router.get('/google-feed.xml', googleProductFeed);
router.get('/:identifier/reviews', getProductReviews);
router.get('/:identifier/purchased', isAuthenticated, checkProductPurchased);
router.post('/:identifier/reviews', isAuthenticated, createProductReview);
router.get('/:identifier', getProductById);

// ---------------------------------------------------------------------------
// Admin writes (login + admin role required)
// ---------------------------------------------------------------------------
router.post('/upload-images', isAuthenticated, isAdmin, uploadProductImages);
router.post('/', isAuthenticated, isAdmin, validateCreateProduct, createProduct);
router.put('/:identifier', isAuthenticated, isAdmin, validateUpdateProduct, updateProduct);
router.delete('/:identifier', isAuthenticated, isAdmin, deleteProduct);

module.exports = router;