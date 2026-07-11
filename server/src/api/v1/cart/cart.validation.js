function validateAddToCart(req, res, next) {
  const { product_id, quantity, price } = req.body;
  if (!product_id || quantity == null || price == null) return res.status(400).json({ success: false, message: 'product_id, quantity and price required' });
  return next();
}

function validateUpdateCartItem(req, res, next) {
  const { quantity } = req.body;
  if (quantity == null) return res.status(400).json({ success: false, message: 'quantity required' });
  return next();
}

module.exports = { validateAddToCart, validateUpdateCartItem };
