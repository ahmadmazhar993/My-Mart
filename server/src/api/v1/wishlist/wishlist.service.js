const { StatusCodes } = require('http-status-codes');
const db = require('../../../db');
const { mapProduct } = require('../../../libs/serializers');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ITEMS = 200;

const isUuid = (value) => typeof value === 'string' && UUID_RE.test(value);

// Newest saved first. Inactive products stay saved but are not shown.
async function loadWishlist(userId) {
  const rows = await db('wishlist_items as w')
    .join('products as p', 'p.productID', 'w.product_id')
    .where('w.user_id', userId)
    .where('p.isActive', true)
    .orderBy('w.createdOn', 'desc')
    .select('p.*');
  return rows.map(mapProduct);
}

async function getWishlist(req, res) {
  try {
    const items = await loadWishlist(req.activeUser.userID);
    return res.status(StatusCodes.OK).json({ success: true, data: items });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to load wishlist' });
  }
}

async function addToWishlist(req, res) {
  try {
    const userId = req.activeUser.userID;
    const { productId } = req.params;
    if (!isUuid(productId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Invalid product id' });
    }

    const product = await db('products').where({ productID: productId, isActive: true }).first();
    if (!product) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Product not found' });
    }

    const [{ count }] = await db('wishlist_items').where({ user_id: userId }).count('* as count');
    const already = await db('wishlist_items').where({ user_id: userId, product_id: productId }).first();
    if (!already && Number(count) >= MAX_ITEMS) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: `Your wishlist can hold up to ${MAX_ITEMS} items` });
    }

    // Idempotent: saving the same product twice is not an error.
    await db('wishlist_items')
      .insert({ user_id: userId, product_id: productId })
      .onConflict(['user_id', 'product_id'])
      .ignore();

    return res.status(StatusCodes.OK).json({ success: true, message: 'Saved to wishlist' });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to update wishlist' });
  }
}

async function removeFromWishlist(req, res) {
  try {
    const { productId } = req.params;
    if (!isUuid(productId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Invalid product id' });
    }
    await db('wishlist_items').where({ user_id: req.activeUser.userID, product_id: productId }).del();
    return res.status(StatusCodes.OK).json({ success: true, message: 'Removed from wishlist' });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to update wishlist' });
  }
}

// Used on login: items a visitor saved while logged out are added to their account, then the
// full account wishlist is returned.
async function mergeWishlist(req, res) {
  try {
    const userId = req.activeUser.userID;
    const ids = Array.isArray(req.body?.product_ids)
      ? [...new Set(req.body.product_ids.filter(isUuid))].slice(0, MAX_ITEMS)
      : [];

    if (ids.length > 0) {
      const existing = await db('wishlist_items').where({ user_id: userId }).count('* as count').first();
      const room = Math.max(0, MAX_ITEMS - Number(existing.count));
      const validProducts = await db('products').whereIn('productID', ids).where({ isActive: true }).select('productID');
      const rows = validProducts.slice(0, room).map((p) => ({ user_id: userId, product_id: p.productID }));
      if (rows.length > 0) {
        await db('wishlist_items').insert(rows).onConflict(['user_id', 'product_id']).ignore();
      }
    }

    const items = await loadWishlist(userId);
    return res.status(StatusCodes.OK).json({ success: true, data: items });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to update wishlist' });
  }
}

module.exports = { getWishlist, addToWishlist, removeFromWishlist, mergeWishlist };
