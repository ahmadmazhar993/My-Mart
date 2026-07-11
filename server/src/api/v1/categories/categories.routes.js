const express = require('express');

const router = express.Router();

const { listCategories, createCategory, getCategoryById, updateCategory, deleteCategory } = require('./categories.service');
const { validateCreateCategory, validateUpdateCategory } = require('./categories.validation');

router.get('/', listCategories);
router.get('/:id', getCategoryById);
router.post('/', validateCreateCategory, createCategory);
router.put('/:id', validateUpdateCategory, updateCategory);
router.delete('/:id', deleteCategory);

module.exports = router;
