const express = require('express');

const router = express.Router();

const { isAuthenticated } = require('../auth/auth.service');
const { getWishlist, addToWishlist, removeFromWishlist, mergeWishlist } = require('./wishlist.service');

router.get('/', isAuthenticated, getWishlist);
router.post('/merge', isAuthenticated, mergeWishlist);
router.put('/:productId', isAuthenticated, addToWishlist);
router.delete('/:productId', isAuthenticated, removeFromWishlist);

module.exports = router;
