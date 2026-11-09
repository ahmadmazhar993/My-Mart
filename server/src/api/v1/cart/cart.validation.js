const isValidQuantity = (value) => Number.isInteger(value) && value >= 1 && value <= 1000;

function validateAddToCart(req, res, next) {
  const { product_id, quantity } = req.body;
  if (!product_id || quantity == null) {
    return res.status(400).json({ success: false, message: 'product_id and quantity required' });
  }
  if (!isValidQuantity(quantity)) {
    return res.status(400).json({ success: false, message: 'quantity must be a whole number between 1 and 1000' });
  }
  return next();
}

function validateUpdateCartItem(req, res, next) {
  const { quantity } = req.body;
  if (quantity == null) return res.status(400).json({ success: false, message: 'quantity required' });
  if (!isValidQuantity(quantity)) {
    return res.status(400).json({ success: false, message: 'quantity must be a whole number between 1 and 1000' });
  }
  return next();
}

module.exports = { validateAddToCart, validateUpdateCartItem };
