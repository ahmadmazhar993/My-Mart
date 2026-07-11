const express = require('express');

const router = express.Router();

const {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImages,
} = require('./products.service');
const { validateCreateProduct, validateUpdateProduct } = require('./products.validation');

router.get('/', listProducts);
router.get('/:id', getProductById);
router.post('/upload-images', uploadProductImages);
router.post('/', validateCreateProduct, createProduct);
router.put('/:id', validateUpdateProduct, updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;
