function validateCreateProduct(req, res, next) {
  const { name, price } = req.body;
  if (!name || price == null) return res.status(400).json({ success: false, message: 'Name and price required' });
  return next();
}

function validateUpdateProduct(req, res, next) {
  return next();
}

module.exports = { validateCreateProduct, validateUpdateProduct };
