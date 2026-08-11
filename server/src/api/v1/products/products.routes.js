const express = require('express');

const router = express.Router();

const {
  listProducts,
  getProductById,
  getProductReviews,
  createProductReview,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImages,
  checkProductPurchased,
  googleProductFeed
} = require('./products.service');
const { validateCreateProduct, validateUpdateProduct } = require('./products.validation');
const { isAuthenticated } = require('../auth/auth.service');

router.get('/', listProducts);
router.get('/google-feed.xml', googleProductFeed);
router.get('/:identifier/reviews', getProductReviews);
router.get('/:identifier/purchased', isAuthenticated, checkProductPurchased);
router.post('/:identifier/reviews', isAuthenticated, createProductReview);
router.get('/:identifier', getProductById);
router.post('/upload-images', uploadProductImages);
router.post('/', validateCreateProduct, createProduct);
router.put('/:identifier', validateUpdateProduct, updateProduct);
router.delete('/:identifier', deleteProduct);

module.exports = router;
