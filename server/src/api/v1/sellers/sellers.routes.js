const express = require('express');

const router = express.Router();

const { listSellers, getSellerById, createSeller, updateSeller, deleteSeller } = require('./sellers.service');
const { validateCreateSeller, validateUpdateSeller } = require('./sellers.validation');

router.get('/', listSellers);
router.get('/:id', getSellerById);
router.post('/', validateCreateSeller, createSeller);
router.put('/:id', validateUpdateSeller, updateSeller);
router.delete('/:id', deleteSeller);

module.exports = router;
