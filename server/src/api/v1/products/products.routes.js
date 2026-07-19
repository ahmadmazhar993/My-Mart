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
} = require('./products.service');
const { validateCreateProduct, validateUpdateProduct } = require('./products.validation');
const { isAuthenticated, isAuthenticatedOptional } = require('../auth/auth.service');

router.get('/', isAuthenticatedOptional, listProducts);
router.get('/:identifier/reviews', getProductReviews);
router.post('/:identifier/reviews', isAuthenticated, createProductReview);
router.get('/:identifier', getProductById);
router.post('/upload-images', uploadProductImages);
router.post('/', isAuthenticated, validateCreateProduct, createProduct);
router.put('/:identifier', isAuthenticated, validateUpdateProduct, updateProduct);
router.delete('/:identifier', isAuthenticated, deleteProduct);

module.exports = router;
