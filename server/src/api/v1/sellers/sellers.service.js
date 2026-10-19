/**
 * Admin-only seller management: applications, status changes, product review.
 * Every route in sellers.routes.js is behind isAuthenticated + isAdmin.
 */
const { StatusCodes } = require('http-status-codes');
const db = require('../../../db');
const {
  isUuid, escapeLike, parsePagination, buildPagination, sendError, sendServerError, audit,
} = require('../seller/seller.shared');
const { mapSeller } = require('../seller/seller.service');
const { querySellerOrders } = require('../seller/seller.orders');
const { mapSellerProduct } = require('../seller/seller.products');
const realtime = require('../../../libs/realtime');

const SELLER_MESSAGES = {
  Approve: 'Your seller application was approved. Welcome aboard!',
  Reject: 'Your seller application was not approved.',
  Suspend: 'Your seller account was suspended.',
  Reactivate: 'Your seller account was reactivated.',
};

const STATUSES = ['pending', 'approved', 'rejected', 'suspended'];

const requireReason = (body) => {
  const reason = String(body?.reason || '').trim();
  return reason.length >= 5 && reason.length <= 500 ? reason : null;
};

const mapAdminSeller = (row) => ({
  ...mapSeller(row),
  user: {
    id: row.user_id,
    name: `${row.firstName || ''} ${row.lastName || ''}`.trim(),
    email: row.email,
  },
  reviewed_on: row.reviewedOn,
  products_count: row.productsCount != null ? Number(row.productsCount) : undefined,
});

async function listSellers(req, res) {
  try {
    const pg = parsePagination(req.query);
    const search = String(req.query.search || '').trim();
    const base = db('sellers as s').join('user as u', 'u.userID', 's.user_id');

    if (STATUSES.includes(req.query.status)) base.where('s.status', req.query.status);
    if (search) {
      const pattern = `%${escapeLike(search)}%`;
      base.where((builder) => builder
        .whereRaw('s."shopName" ILIKE ?', [pattern])
        .orWhereRaw('u.email ILIKE ?', [pattern])
        .orWhereRaw('(u."firstName" || \' \' || u."lastName") ILIKE ?', [pattern]));
    }

    const totalRow = await base.clone().count({ total: '*' }).first();
    const rows = await base.clone()
      .select('s.*', 'u.firstName', 'u.lastName', 'u.email',
        db.raw('(SELECT COUNT(*) FROM products p WHERE p.seller_id = s."sellerID" AND p."archivedOn" IS NULL) AS "productsCount"'))
      .orderByRaw('CASE s.status WHEN \'pending\' THEN 0 ELSE 1 END')
      .orderBy('s.createdOn', 'desc')
      .limit(pg.limit)
      .offset(pg.offset);

    return res.json({
      success: true,
      data: rows.map(mapAdminSeller),
      pagination: buildPagination(pg, Number(totalRow.total)),
    });
  } catch (err) {
    return sendServerError(res, 'admin.listSellers', err);
  }
}

async function getSellerById(req, res) {
  try {
    if (!isUuid(req.params.id)) return sendError(res, StatusCodes.NOT_FOUND, 'Seller not found');
    const row = await db('sellers as s')
      .join('user as u', 'u.userID', 's.user_id')
      .first('s.*', 'u.firstName', 'u.lastName', 'u.email')
      .where('s.sellerID', req.params.id);
    if (!row) return sendError(res, StatusCodes.NOT_FOUND, 'Seller not found');

    const [productCounts, sales, log] = await Promise.all([
      db('products').where({ seller_id: row.sellerID }).whereNull('archivedOn')
        .select('approvalStatus').count({ n: '*' }).groupBy('approvalStatus'),
      db('order_items as oi').join('orders as o', 'o.orderID', 'oi.order_id').where('oi.seller_id', row.sellerID).first(
        db.raw('COALESCE(SUM(oi."totalPrice") FILTER (WHERE o.status <> \'cancelled\' AND o."paymentStatus" <> \'refunded\'), 0) AS gross'),
        db.raw('COUNT(DISTINCT o."orderID") FILTER (WHERE o.status <> \'cancelled\') AS orders'),
        db.raw('COUNT(DISTINCT o."orderID") FILTER (WHERE o.status = \'cancelled\') AS cancelled'),
        db.raw('COUNT(DISTINCT o."orderID") FILTER (WHERE o."paymentStatus" = \'refunded\') AS refunded')
      ),
      db('userActivityLog as l')
        .leftJoin('user as a', 'a.userID', 'l.userID')
        .where('l.targetEntity', 'Seller')
        .where('l.targetID', row.sellerID)
        .orderBy('l.userActivityLogTime', 'desc')
        .limit(30)
        .select('l.action', 'l.description', 'l.data', 'l.userActivityLogTime', 'a.firstName', 'a.lastName'),
    ]);

    return res.json({
      success: true,
      data: {
        ...mapAdminSeller(row),
        products_by_status: Object.fromEntries(productCounts.map((c) => [c.approvalStatus, Number(c.n)])),
        performance: {
          gross_sales: Number(sales.gross),
          orders: Number(sales.orders),
          cancelled_orders: Number(sales.cancelled),
          refunded_orders: Number(sales.refunded),
        },
        audit_log: log.map((entry) => ({
          action: entry.action,
          description: entry.description,
          by: `${entry.firstName || ''} ${entry.lastName || ''}`.trim() || null,
          at: entry.userActivityLogTime,
          data: entry.data,
        })),
      },
    });
  } catch (err) {
    return sendServerError(res, 'admin.getSeller', err);
  }
}

/**
 * Atomic status transition. `from` guards against acting on stale state
 * (e.g. two admins reviewing the same application).
 */
async function transition(req, res, {
  from, to, action, reasonField = null, apply = () => ({}), afterUpdate = null,
}) {
  try {
    if (!isUuid(req.params.id)) return sendError(res, StatusCodes.NOT_FOUND, 'Seller not found');

    let reason = null;
    if (reasonField) {
      reason = requireReason(req.body);
      if (!reason) return sendError(res, StatusCodes.BAD_REQUEST, 'Please provide a reason (5 to 500 characters).');
    }

    const outcome = await db.transaction(async (trx) => {
      const seller = await trx('sellers').first('*').where({ sellerID: req.params.id }).forUpdate();
      if (!seller) return { code: StatusCodes.NOT_FOUND, message: 'Seller not found' };
      if (!from.includes(seller.status)) {
        return { code: StatusCodes.CONFLICT, message: `Seller is ${seller.status}; this action needs ${from.join(' or ')}.` };
      }
      const update = {
        status: to,
        reviewedBy: req.activeUser.userID,
        reviewedOn: trx.fn.now(),
        updatedOn: trx.fn.now(),
        ...apply(reason),
      };
      const [updated] = await trx('sellers').where({ sellerID: seller.sellerID }).update(update, '*');
      if (afterUpdate) await afterUpdate(trx, updated);
      return { seller: updated };
    });

    if (outcome.code) return sendError(res, outcome.code, outcome.message);

    await audit({
      entity: 'Seller',
      targetID: outcome.seller.sellerID,
      action,
      description: `${action} seller "${outcome.seller.shopName}"${reason ? `: ${reason}` : ''}`,
      userID: req.activeUser.userID,
      data: { reason },
    });
    realtime.emitSeller(outcome.seller.sellerID, 'seller', {
      id: outcome.seller.sellerID,
      action: action.toLowerCase(),
      messages: { seller: SELLER_MESSAGES[action], customer: SELLER_MESSAGES[action] },
    });
    return res.json({ success: true, data: mapSeller(outcome.seller) });
  } catch (err) {
    return sendServerError(res, `admin.${action}`, err);
  }
}

const setRole = async (trx, userId, roleName) => {
  const role = await trx('accessTemplate').first('accessTemplateID').where({ name: roleName });
  if (!role) throw new Error(`${roleName} role is not configured`);
  await trx('user').where({ userID: userId }).update({ accessTemplateID: role.accessTemplateID, updatedOn: trx.fn.now() });
};

// Approval is the only place a user is promoted to the Seller role.
const approveSeller = (req, res) => transition(req, res, {
  from: ['pending'],
  to: 'approved',
  action: 'Approve',
  apply: () => ({ approvedOn: db.fn.now(), rejectionReason: null, suspendedReason: null }),
  afterUpdate: (trx, seller) => setRole(trx, seller.user_id, 'Seller'),
});

const rejectSeller = (req, res) => transition(req, res, {
  from: ['pending'],
  to: 'rejected',
  action: 'Reject',
  reasonField: true,
  apply: (reason) => ({ rejectionReason: reason }),
});

// Suspension hides the seller's storefront products immediately.
const suspendSeller = (req, res) => transition(req, res, {
  from: ['approved'],
  to: 'suspended',
  action: 'Suspend',
  reasonField: true,
  apply: (reason) => ({ suspendedReason: reason }),
  afterUpdate: (trx, seller) => trx('products').where({ seller_id: seller.sellerID }).update({ isActive: false, updatedOn: trx.fn.now() }),
});

// Products stay unpublished after reactivation; the seller republishes deliberately.
const reactivateSeller = (req, res) => transition(req, res, {
  from: ['suspended'],
  to: 'approved',
  action: 'Reactivate',
  apply: () => ({ suspendedReason: null }),
});

async function updateSeller(req, res) {
  try {
    if (!isUuid(req.params.id)) return sendError(res, StatusCodes.NOT_FOUND, 'Seller not found');
    const body = req.body || {};
    const values = {};
    if (body.shop_name != null) {
      const name = String(body.shop_name).trim();
      if (name.length < 3 || name.length > 80) return sendError(res, StatusCodes.BAD_REQUEST, 'Store name must be 3 to 80 characters.');
      values.shopName = name;
    }
    if (body.shop_description != null) values.shopDescription = String(body.shop_description).trim().slice(0, 1000) || null;
    if (body.contact_phone != null) values.contactPhone = String(body.contact_phone).trim().slice(0, 40) || null;
    if (body.business_address != null) values.businessAddress = String(body.business_address).trim().slice(0, 300) || null;
    if (Object.keys(values).length === 0) return sendError(res, StatusCodes.BAD_REQUEST, 'Nothing to update.');

    const [seller] = await db('sellers').where({ sellerID: req.params.id }).update({ ...values, updatedOn: db.fn.now() }, '*');
    if (!seller) return sendError(res, StatusCodes.NOT_FOUND, 'Seller not found');
    await audit({
      entity: 'Seller', targetID: seller.sellerID, action: 'AdminEdit', description: 'Admin edited seller details', userID: req.activeUser.userID, data: { fields: Object.keys(values) },
    });
    realtime.emitSeller(seller.sellerID, 'seller', { id: seller.sellerID, action: 'updated' });
    return res.json({ success: true, data: mapSeller(seller) });
  } catch (err) {
    return sendServerError(res, 'admin.updateSeller', err);
  }
}

async function listSellerOrders(req, res) {
  try {
    if (!isUuid(req.params.id)) return sendError(res, StatusCodes.NOT_FOUND, 'Seller not found');
    const result = await querySellerOrders(req.params.id, req.query);
    return res.json({ success: true, ...result });
  } catch (err) {
    return sendServerError(res, 'admin.listSellerOrders', err);
  }
}

async function listSellerProducts(req, res) {
  try {
    if (!isUuid(req.params.id)) return sendError(res, StatusCodes.NOT_FOUND, 'Seller not found');
    const pg = parsePagination(req.query);
    const base = db('products').where('products.seller_id', req.params.id).whereNull('products.archivedOn');
    const totalRow = await base.clone().count({ total: '*' }).first();
    const rows = await base.clone()
      .leftJoin('categories', 'categories.categoryID', 'products.category_id')
      .select('products.*', 'categories.name as categoryName', db.raw('0 AS "unitsSold"'))
      .orderBy('products.updatedOn', 'desc')
      .limit(pg.limit)
      .offset(pg.offset);
    return res.json({ success: true, data: rows.map(mapSellerProduct), pagination: buildPagination(pg, Number(totalRow.total)) });
  } catch (err) {
    return sendServerError(res, 'admin.listSellerProducts', err);
  }
}

/* -------------------------- product review queue --------------------------- */

async function listReviewQueue(req, res) {
  try {
    const pg = parsePagination(req.query);
    const status = ['pending_review', 'rejected', 'approved'].includes(req.query.status) ? req.query.status : 'pending_review';
    // Admin-created catalogue products are backfilled as approved; only seller-submitted ones are reviewed.
    const base = db('products as p')
      .join('sellers as s', 's.sellerID', 'p.seller_id')
      .leftJoin('categories as c', 'c.categoryID', 'p.category_id')
      .where('p.approvalStatus', status)
      .whereNull('p.archivedOn');
    if (status === 'approved') base.whereNotNull('p.submittedOn');

    const totalRow = await base.clone().count({ total: '*' }).first();
    const rows = await base.clone()
      .select('p.*', 'c.name as categoryName', 's.shopName', db.raw('0 AS "unitsSold"'))
      .orderBy('p.submittedOn', 'asc')
      .limit(pg.limit)
      .offset(pg.offset);

    return res.json({
      success: true,
      data: rows.map((row) => ({ ...mapSellerProduct(row), seller_name: row.shopName, seller_id: row.seller_id, submitted_on: row.submittedOn })),
      pagination: buildPagination(pg, Number(totalRow.total)),
    });
  } catch (err) {
    return sendServerError(res, 'admin.listReviewQueue', err);
  }
}

async function reviewProduct(req, res, { approve }) {
  try {
    if (!isUuid(req.params.productId)) return sendError(res, StatusCodes.NOT_FOUND, 'Product not found');
    const reason = approve ? null : requireReason(req.body);
    if (!approve && !reason) return sendError(res, StatusCodes.BAD_REQUEST, 'Please provide a rejection reason (5 to 500 characters).');

    const outcome = await db.transaction(async (trx) => {
      const product = await trx('products as p').join('sellers as s', 's.sellerID', 'p.seller_id')
        .first('p.*', 's.status as sellerStatus').where('p.productID', req.params.productId).forUpdate('p');
      if (!product) return { code: StatusCodes.NOT_FOUND, message: 'Product not found' };
      if (product.approvalStatus !== 'pending_review') {
        return { code: StatusCodes.CONFLICT, message: 'Only products pending review can be reviewed.' };
      }
      const update = approve
        // Approved products go live straight away unless the seller is suspended.
        ? { approvalStatus: 'approved', rejectionReason: null, isActive: product.sellerStatus === 'approved' }
        : { approvalStatus: 'rejected', rejectionReason: reason, isActive: false };
      await trx('products').where({ productID: product.productID }).update({ ...update, updatedOn: trx.fn.now() });
      return { product };
    });

    if (outcome.code) return sendError(res, outcome.code, outcome.message);
    await audit({
      entity: 'SellerProduct',
      targetID: outcome.product.productID,
      action: approve ? 'ProductApprove' : 'ProductReject',
      description: `${approve ? 'Approved' : 'Rejected'} product "${outcome.product.name}"${reason ? `: ${reason}` : ''}`,
      userID: req.activeUser.userID,
      data: { reason, sellerID: outcome.product.seller_id },
    });
    realtime.emitSeller(outcome.product.seller_id, 'product', {
      id: outcome.product.productID,
      action: approve ? 'approved' : 'rejected',
      messages: { seller: approve ? `Your product "${outcome.product.name}" was approved.` : `Your product "${outcome.product.name}" was rejected.` },
    });
    return res.json({ success: true, message: approve ? 'Product approved.' : 'Product rejected.' });
  } catch (err) {
    return sendServerError(res, 'admin.reviewProduct', err);
  }
}

const approveProduct = (req, res) => reviewProduct(req, res, { approve: true });
const rejectProduct = (req, res) => reviewProduct(req, res, { approve: false });

module.exports = {
  listSellers,
  getSellerById,
  approveSeller,
  rejectSeller,
  suspendSeller,
  reactivateSeller,
  updateSeller,
  listSellerOrders,
  listSellerProducts,
  listReviewQueue,
  approveProduct,
  rejectProduct,
};
