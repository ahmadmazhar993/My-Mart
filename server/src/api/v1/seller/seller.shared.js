const { StatusCodes } = require('http-status-codes');
const activityLogger = require('../../../libs/activityLogger');
const logger = require('../../../config/winston');

// No per-product threshold exists in the schema, so one marketplace-wide value is used.
const LOW_STOCK_THRESHOLD = 5;

const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));

// Escape LIKE wildcards so a search for "100%" or "a_b" is treated literally.
const escapeLike = (value) => String(value).replace(/[\\%_]/g, (char) => `\\${char}`);

const parsePagination = (query, { defaultLimit = 20, maxLimit = 100 } = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, offset: (page - 1) * limit };
};

const buildPagination = ({ page, limit }, total) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1,
  };
};

const sendError = (res, status, message, extra = {}) => res
  .status(status)
  .json({ success: false, message, ...extra });

const sendValidationError = (res, errors) => sendError(
  res,
  StatusCodes.BAD_REQUEST,
  Object.values(errors)[0] || 'Invalid request',
  { errors },
);

const sendServerError = (res, scope, err) => {
  logger.error(`[SELLER][${scope}]::Exception::`, err);
  return sendError(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Something went wrong. Please try again.');
};

// Audit trail must never break the action it describes.
const audit = async ({
  entity, targetID, action, description, userID, data = null,
}) => {
  try {
    await activityLogger({
      targetEntity: entity, targetID: String(targetID), action, description, userID, data,
    });
  } catch (err) {
    logger.error('[SELLER][audit]::Failed to write activity log', err);
  }
};

const toInt = (value) => {
  if (typeof value === 'number') return Number.isInteger(value) ? value : null;
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return parseInt(value, 10);
  return null;
};

const toMoney = (value) => {
  if (value == null || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return NaN;
  return Math.round(number * 100) / 100;
};

// Dates from query strings: YYYY-MM-DD only.
const parseDateParam = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

module.exports = {
  LOW_STOCK_THRESHOLD,
  isUuid,
  escapeLike,
  parsePagination,
  buildPagination,
  sendError,
  sendValidationError,
  sendServerError,
  audit,
  toInt,
  toMoney,
  parseDateParam,
};
