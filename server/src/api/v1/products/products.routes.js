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
const { isAuthenticated } = require('../auth/auth.service');

router.get('/', listProducts);
router.get('/:identifier/reviews', getProductReviews);
router.post('/:identifier/reviews', isAuthenticated, createProductReview);
router.get('/:identifier', getProductById);
router.post('/upload-images', uploadProductImages);
router.post('/', validateCreateProduct, createProduct);
router.put('/:identifier', validateUpdateProduct, updateProduct);
router.delete('/:identifier', deleteProduct);

module.exports = router;
