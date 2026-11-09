const { StatusCodes } = require('http-status-codes');

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_METHODS = ['cod', 'online'];

function validateCreateOrder(req, res, next) {
  const { shipping_address, items, payment_method, user_id } = req.body;

  if (!shipping_address) {
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'shipping_address is required' });
  }
  if (!items?.length) {
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'At least one item is required' });
  }
  if (payment_method && !PAYMENT_METHODS.includes(payment_method)) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'payment_method must be cod or online',
    });
  }

  if (user_id !== undefined && typeof user_id !== 'string') {
    return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'user_id must be a valid user ID' });
  }

  if (!Array.isArray(items) || items.length > 100) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'items must be a list of at most 100 entries',
    });
  }

  for (const item of items) {
    if (!item || !item.product_id || !Number.isInteger(item.quantity)
      || item.quantity < 1 || item.quantity > 1000) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Each item requires product_id and a whole-number quantity between 1 and 1000',
      });
    }
  }

  return next();
}

function validateUpdateOrderStatus(req, res, next) {
  const { status, paymentStatus } = req.body;

  if (typeof status !== 'undefined' && !ORDER_STATUSES.includes(status)) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: `status must be one of: ${ORDER_STATUSES.join(', ')}`,
    });
  }

  if (typeof paymentStatus !== 'undefined' && !['unpaid', 'paid', 'refunded'].includes(paymentStatus)) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'paymentStatus must be one of: unpaid, paid, refunded',
    });
  }

  if (typeof status === 'undefined' && typeof paymentStatus === 'undefined') {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'Either status or paymentStatus is required',
    });
  }

  return next();
}

module.exports = { validateCreateOrder, validateUpdateOrderStatus };
