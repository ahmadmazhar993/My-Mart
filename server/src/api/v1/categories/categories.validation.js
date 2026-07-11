function validateCreateCategory(req, res, next) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Name required' });
  return next();
}

function validateUpdateCategory(req, res, next) { return next(); }

module.exports = { validateCreateCategory, validateUpdateCategory };
