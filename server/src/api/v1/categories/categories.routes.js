const express = require('express');

const router = express.Router();

const { isAuthenticated, isAdmin } = require('../auth/auth.service');
const { listCategories, createCategory, getCategoryById, updateCategory, deleteCategory } = require('./categories.service');
const { validateCreateCategory, validateUpdateCategory } = require('./categories.validation');

router.get('/', listCategories);
router.get('/:id', getCategoryById);
router.post('/', isAuthenticated, isAdmin, validateCreateCategory, createCategory);
router.put('/:id', isAuthenticated, isAdmin, validateUpdateCategory, updateCategory);
router.delete('/:id', isAuthenticated, isAdmin, deleteCategory);

module.exports = router;
