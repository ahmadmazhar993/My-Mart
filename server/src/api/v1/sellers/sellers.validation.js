function validateCreateSeller(req, res, next) {
  const { user_id, shop_name } = req.body;
  if (!user_id || !shop_name) return res.status(400).json({ success: false, message: 'user_id and shop_name required' });
  return next();
}

function validateUpdateSeller(req, res, next) { return next(); }

module.exports = { validateCreateSeller, validateUpdateSeller };
