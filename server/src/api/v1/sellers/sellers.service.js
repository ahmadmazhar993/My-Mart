const { StatusCodes } = require('http-status-codes');
const db = require('../../../db');
const logger = require('../../../config/winston');

const SELLER_STATUSES = ['pending', 'approved', 'rejected', 'suspended'];

const mapSeller = (seller) => ({
  id: seller.sellerID,
  user_id: seller.user_id,
  shop_name: seller.shopName,
  shop_description: seller.shopDescription,
  shop_logo_url: seller.shopLogoUrl,
  rating: Number(seller.rating),
  total_sales: seller.totalSales,
  status: seller.status,
  approved_at: seller.approvedOn,
  created_at: seller.createdOn,
  updated_at: seller.updatedOn,
});

// Only these request fields can ever reach the database (no mass assignment).
const pickSellerFields = (body) => {
  const fields = {};
  if (body.user_id !== undefined) fields.user_id = body.user_id;
  if (body.shop_name !== undefined) fields.shopName = String(body.shop_name).trim();
  if (body.shop_description !== undefined) fields.shopDescription = body.shop_description;
  if (body.shop_logo_url !== undefined) fields.shopLogoUrl = body.shop_logo_url;
  if (body.status !== undefined) {
    if (!SELLER_STATUSES.includes(body.status)) {
      throw Object.assign(new Error(`status must be one of: ${SELLER_STATUSES.join(', ')}`), { statusCode: 400 });
    }
    fields.status = body.status;
    if (body.status === 'approved') fields.approvedOn = db.fn.now();
  }
  return fields;
};

const fail = (res, err, fallback) => {
  if (err.statusCode) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }
  logger.error(`[SELLERS]::${fallback}`, err);
  return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: fallback });
};

async function listSellers(req, res) {
  try {
    const sellers = await db('sellers').select('*').orderBy('createdOn', 'desc');
    return res.status(StatusCodes.OK).json({ success: true, data: sellers.map(mapSeller) });
  } catch (err) {
    return fail(res, err, 'Failed to load sellers');
  }
}

async function getSellerById(req, res) {
  try {
    const seller = await db('sellers').where({ sellerID: req.params.id }).first();
    if (!seller) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Seller not found' });
    }
    return res.status(StatusCodes.OK).json({ success: true, data: mapSeller(seller) });
  } catch (err) {
    return fail(res, err, 'Failed to load seller');
  }
}

async function createSeller(req, res) {
  try {
    const [created] = await db('sellers').insert(pickSellerFields(req.body)).returning('*');
    return res.status(StatusCodes.CREATED).json({ success: true, data: mapSeller(created) });
  } catch (err) {
    return fail(res, err, 'Failed to create seller');
  }
}

async function updateSeller(req, res) {
  try {
    const fields = pickSellerFields(req.body);
    if (Object.keys(fields).length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Nothing to update' });
    }
    const [updated] = await db('sellers')
      .where({ sellerID: req.params.id })
      .update({ ...fields, updatedOn: db.fn.now() })
      .returning('*');
    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Seller not found' });
    }
    return res.status(StatusCodes.OK).json({ success: true, data: mapSeller(updated) });
  } catch (err) {
    return fail(res, err, 'Failed to update seller');
  }
}

async function deleteSeller(req, res) {
  try {
    const inUse = await db('products').where({ seller_id: req.params.id }).first('productID');
    if (inUse) {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: 'Seller still has products and cannot be deleted.',
      });
    }
    const deleted = await db('sellers').where({ sellerID: req.params.id }).del();
    if (!deleted) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Seller not found' });
    }
    return res.status(StatusCodes.OK).json({ success: true, message: 'Seller deleted' });
  } catch (err) {
    return fail(res, err, 'Failed to delete seller');
  }
}

module.exports = { listSellers, getSellerById, createSeller, updateSeller, deleteSeller };
