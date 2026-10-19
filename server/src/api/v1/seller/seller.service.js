const { StatusCodes } = require('http-status-codes');
const db = require('../../../db');
const {
  LOW_STOCK_THRESHOLD, sendError, sendValidationError, sendServerError, audit, parseDateParam,
} = require('./seller.shared');
const { querySellerOrders } = require('./seller.orders');
const { getSellerBalances } = require('../../../libs/ledger');
const realtime = require('../../../libs/realtime');

const PHONE = /^\+?[0-9][0-9\s-]{6,18}$/;

const mapSeller = (row) => ({
  id: row.sellerID,
  shop_name: row.shopName,
  shop_description: row.shopDescription,
  shop_logo_url: row.shopLogoUrl,
  contact_phone: row.contactPhone,
  business_address: row.businessAddress,
  status: row.status,
  rejection_reason: row.status === 'rejected' ? row.rejectionReason : null,
  suspended_reason: row.status === 'suspended' ? row.suspendedReason : null,
  approved_on: row.approvedOn,
  applied_on: row.createdOn,
  notifications: {
    new_order: row.notifyNewOrder !== false,
    returns: row.notifyReturns !== false,
    payouts: row.notifyPayouts !== false,
  },
});

/** Application status for the signed-in user (any role). Drives the portal's gating screens. */
async function getMyStatus(req, res) {
  try {
    const seller = await db('sellers').first('*').where({ user_id: req.activeUser.userID });
    return res.json({
      success: true,
      data: { status: seller ? seller.status : 'none', seller: seller ? mapSeller(seller) : null },
    });
  } catch (err) {
    return sendServerError(res, 'getMyStatus', err);
  }
}

const validateProfile = (body, { requireShopName }) => {
  const errors = {};
  const values = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(body, key);

  if (requireShopName) {
    const shopName = String(body.shop_name || '').trim();
    if (shopName.length < 3 || shopName.length > 80) errors.shop_name = 'Store name must be 3 to 80 characters.';
    else values.shopName = shopName;
  }
  if (requireShopName || has('shop_description')) {
    const description = String(body.shop_description || '').trim();
    if (description.length > 1000) errors.shop_description = 'Description must be 1000 characters or fewer.';
    else values.shopDescription = description || null;
  }
  if (requireShopName || has('contact_phone')) {
    const phone = String(body.contact_phone || '').trim();
    if (!PHONE.test(phone)) errors.contact_phone = 'Enter a valid phone number.';
    else values.contactPhone = phone;
  }
  if (has('business_address')) {
    const address = String(body.business_address || '').trim();
    if (address.length > 300) errors.business_address = 'Address must be 300 characters or fewer.';
    else values.businessAddress = address || null;
  }
  [['notify_new_order', 'notifyNewOrder'], ['notify_returns', 'notifyReturns'], ['notify_payouts', 'notifyPayouts']].forEach(([key, column]) => {
    if (has(key)) {
      if (typeof body[key] !== 'boolean') errors[key] = 'Notification preference must be on or off.';
      else values[column] = body[key];
    }
  });
  return { errors, values };
};

async function apply(req, res) {
  try {
    const body = req.body || {};
    const { errors, values } = validateProfile(body, { requireShopName: true });
    if (body.accept_terms !== true) errors.accept_terms = 'You must accept the seller terms to apply.';
    if (Object.keys(errors).length) return sendValidationError(res, errors);

    const role = await db('accessTemplate').first('type').where('accessTemplateID', req.activeUser.accessTemplateID);
    if (role?.type !== 'Customer') {
      return sendError(res, StatusCodes.FORBIDDEN, 'Only customer accounts can apply to become a seller.');
    }

    const clash = await db('sellers').first('sellerID').whereRaw('lower("shopName") = ?', [values.shopName.toLowerCase()]);
    const existing = await db('sellers').first('*').where({ user_id: req.activeUser.userID });
    if (clash && clash.sellerID !== existing?.sellerID) {
      return sendError(res, StatusCodes.CONFLICT, 'That store name is already taken.', { errors: { shop_name: 'That store name is already taken.' } });
    }

    let seller;
    if (!existing) {
      [seller] = await db('sellers').insert({ ...values, user_id: req.activeUser.userID, status: 'pending' }, '*');
    } else if (existing.status === 'rejected') {
      // Rejected applicants may correct and re-apply.
      [seller] = await db('sellers').where({ sellerID: existing.sellerID }).update({
        ...values, status: 'pending', rejectionReason: null, reviewedBy: null, reviewedOn: null, updatedOn: db.fn.now(),
      }, '*');
    } else {
      return sendError(res, StatusCodes.CONFLICT, `You already have a seller application (${existing.status}).`);
    }

    await audit({
      entity: 'Seller', targetID: seller.sellerID, action: 'Apply', description: `Seller application submitted for "${seller.shopName}"`, userID: req.activeUser.userID,
    });
    realtime.emitSeller(seller.sellerID, 'seller', {
      id: seller.sellerID,
      action: 'applied',
      messages: { admin: `New seller application: ${seller.shopName}` },
    });
    return res.status(StatusCodes.CREATED).json({ success: true, data: mapSeller(seller) });
  } catch (err) {
    if (err?.code === '23505') return sendError(res, StatusCodes.CONFLICT, 'You already have a seller application.');
    return sendServerError(res, 'apply', err);
  }
}

async function getProfile(req, res) {
  return res.json({ success: true, data: mapSeller(req.seller) });
}

// Store name and status are deliberately not self-editable; AHM Mart staff change those.
async function updateProfile(req, res) {
  try {
    const { errors, values } = validateProfile(req.body || {}, { requireShopName: false });
    if (Object.keys(errors).length) return sendValidationError(res, errors);
    if (Object.keys(values).length === 0) return sendError(res, StatusCodes.BAD_REQUEST, 'Nothing to update.');

    const [seller] = await db('sellers')
      .where({ sellerID: req.seller.sellerID })
      .update({ ...values, updatedOn: db.fn.now() }, '*');
    await audit({
      entity: 'Seller', targetID: seller.sellerID, action: 'ProfileUpdate', description: 'Store profile updated', userID: req.activeUser.userID, data: { fields: Object.keys(values) },
    });
    return res.json({ success: true, data: mapSeller(seller) });
  } catch (err) {
    return sendServerError(res, 'updateProfile', err);
  }
}

async function updateLogo(req, res) {
  try {
    const [seller] = await db('sellers')
      .where({ sellerID: req.seller.sellerID })
      .update({ shopLogoUrl: req.uploadedPaths[0], updatedOn: db.fn.now() }, '*');
    await audit({
      entity: 'Seller', targetID: seller.sellerID, action: 'LogoUpdate', description: 'Store logo updated', userID: req.activeUser.userID,
    });
    return res.json({ success: true, data: mapSeller(seller) });
  } catch (err) {
    return sendServerError(res, 'updateLogo', err);
  }
}

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                  */
/* -------------------------------------------------------------------------- */

const isoDay = (date) => date.toISOString().slice(0, 10);

const resolveRange = (query) => {
  const today = new Date();
  const toDate = parseDateParam(query.to) || new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const defaultFrom = new Date(toDate.getTime() - 29 * 86400000);
  let fromDate = parseDateParam(query.from) || defaultFrom;
  if (fromDate > toDate) fromDate = toDate;
  if ((toDate - fromDate) / 86400000 > 365) fromDate = new Date(toDate.getTime() - 365 * 86400000);
  return { from: isoDay(fromDate), to: isoDay(toDate), fromDate, toDate };
};

// Money from "live" orders: placed, not cancelled, not refunded.
const SALES_FILTER = 'o.status <> \'cancelled\' AND o."paymentStatus" <> \'refunded\'';

async function getDashboard(req, res) {
  try {
    const sellerID = req.seller.sellerID;
    const range = resolveRange(req.query);

    const itemsBase = () => db('order_items as oi').join('orders as o', 'o.orderID', 'oi.order_id').where('oi.seller_id', sellerID);
    const inRange = (qb) => qb
      .whereRaw('o."createdOn"::date >= ?::date', [range.from])
      .whereRaw('o."createdOn"::date <= ?::date', [range.to]);

    const [allTime, period, toFulfil, products, daily, top, lowStock, recentOrders, activity, periodLedger, allLedger] = await Promise.all([
      itemsBase().first(db.raw(`COALESCE(SUM(oi."totalPrice") FILTER (WHERE ${SALES_FILTER}), 0) AS gross`)),
      inRange(itemsBase()).first(
        db.raw(`COALESCE(SUM(oi."totalPrice") FILTER (WHERE ${SALES_FILTER}), 0) AS gross`),
        db.raw('COALESCE(SUM(oi."totalPrice") FILTER (WHERE o.status <> \'cancelled\' AND o."paymentStatus" = \'paid\'), 0) AS paid'),
        db.raw('COALESCE(SUM(oi."totalPrice") FILTER (WHERE o.status = \'cancelled\'), 0) AS cancelled_amount'),
        db.raw('COALESCE(SUM(oi."totalPrice") FILTER (WHERE o."paymentStatus" = \'refunded\'), 0) AS refunded_amount'),
        db.raw('COUNT(DISTINCT o."orderID") FILTER (WHERE o.status <> \'cancelled\') AS orders'),
        db.raw('COUNT(DISTINCT o."orderID") FILTER (WHERE o.status IN (\'pending\', \'confirmed\', \'processing\')) AS pending_orders'),
        db.raw('COUNT(DISTINCT o."orderID") FILTER (WHERE o.status = \'cancelled\') AS cancelled_orders'),
        db.raw('COUNT(DISTINCT o."orderID") FILTER (WHERE o."paymentStatus" = \'refunded\') AS refunded_orders'),
        db.raw('COALESCE(SUM(oi.quantity) FILTER (WHERE o.status <> \'cancelled\'), 0) AS units')
      ),
      // Current workload, independent of the date filter.
      itemsBase()
        .whereIn('o.status', ['confirmed', 'processing', 'shipped'])
        .whereNot('oi.fulfillmentStatus', 'shipped')
        .first(db.raw('COUNT(DISTINCT o."orderID") AS n')),
      db('products').where({ seller_id: sellerID }).whereNull('archivedOn').first(
        db.raw('COUNT(*) AS total'),
        db.raw('COUNT(*) FILTER (WHERE "approvalStatus" = \'approved\' AND "isActive") AS published'),
        db.raw('COUNT(*) FILTER (WHERE "approvalStatus" = \'pending_review\') AS pending_review'),
        db.raw('COUNT(*) FILTER (WHERE "approvalStatus" = \'rejected\') AS rejected'),
        db.raw('COUNT(*) FILTER (WHERE "stockQuantity" BETWEEN 1 AND ?) AS low_stock', [LOW_STOCK_THRESHOLD]),
        db.raw('COUNT(*) FILTER (WHERE "stockQuantity" <= 0) AS out_of_stock')
      ),
      inRange(itemsBase())
        .whereRaw(SALES_FILTER)
        .groupByRaw('o."createdOn"::date')
        .orderByRaw('o."createdOn"::date')
        .select(
          db.raw('to_char(o."createdOn"::date, \'YYYY-MM-DD\') AS day'),
          db.raw('SUM(oi."totalPrice") AS sales'),
          db.raw('COUNT(DISTINCT o."orderID") AS orders')
        ),
      inRange(itemsBase())
        .join('products as p', 'p.productID', 'oi.product_id')
        .whereRaw(SALES_FILTER)
        .groupBy('p.productID', 'p.name', 'p.imageUrl')
        .orderByRaw('SUM(oi."totalPrice") DESC')
        .limit(5)
        .select('p.productID', 'p.name', 'p.imageUrl', db.raw('SUM(oi.quantity) AS units'), db.raw('SUM(oi."totalPrice") AS revenue')),
      db('products')
        .where({ seller_id: sellerID })
        .whereNull('archivedOn')
        .where('stockQuantity', '<=', LOW_STOCK_THRESHOLD)
        .orderBy('stockQuantity', 'asc')
        .limit(6)
        .select('productID', 'name', 'sku', 'imageUrl', 'stockQuantity'),
      querySellerOrders(sellerID, { limit: 5 }),
      db('userActivityLog')
        .where({ userID: req.activeUser.userID })
        .whereIn('targetEntity', ['Seller', 'SellerProduct', 'SellerInventory', 'SellerOrder'])
        .orderBy('userActivityLogTime', 'desc')
        .limit(8)
        .select('action', 'description', 'userActivityLogTime'),
      getSellerBalances(db, sellerID, { from: range.from, to: range.to }),
      getSellerBalances(db, sellerID),
    ]);

    // Fill days with no sales so the chart axis is continuous.
    const byDay = new Map(daily.map((row) => [row.day, row]));
    const series = [];
    for (let t = range.fromDate.getTime(); t <= range.toDate.getTime(); t += 86400000) {
      const day = isoDay(new Date(t));
      const row = byDay.get(day);
      series.push({ day, sales: Number(row?.sales || 0), orders: Number(row?.orders || 0) });
    }

    return res.json({
      success: true,
      data: {
        range: { from: range.from, to: range.to },
        totals: {
          total_sales: Number(allTime.gross),
          period_sales: Number(period.gross),
          period_paid_sales: Number(period.paid),
          cancelled_amount: Number(period.cancelled_amount),
          refunded_amount: Number(period.refunded_amount),
          period_units: Number(period.units),
          orders: Number(period.orders),
          pending_orders: Number(period.pending_orders),
          cancelled_orders: Number(period.cancelled_orders),
          refunded_orders: Number(period.refunded_orders),
          orders_to_fulfil: Number(toFulfil.n),
        },
        // From the commission ledger (paid orders only). Fees are shown separately from refunds.
        earnings: {
          fees: periodLedger.commission_charged,
          net_earnings: periodLedger.net_earnings,
          refunds: periodLedger.refunds,
          pending_earnings: allLedger.pending_earnings,
          available_balance: allLedger.available_for_payout,
          pending_payouts: allLedger.payout_requested,
          paid_out: allLedger.paid_out,
        },
        products: {
          total: Number(products.total),
          published: Number(products.published),
          pending_review: Number(products.pending_review),
          rejected: Number(products.rejected),
          low_stock: Number(products.low_stock),
          out_of_stock: Number(products.out_of_stock),
          low_stock_threshold: LOW_STOCK_THRESHOLD,
        },
        series,
        top_products: top.map((row) => ({
          id: row.productID, name: row.name, image_url: row.imageUrl, units: Number(row.units), revenue: Number(row.revenue),
        })),
        low_stock_products: lowStock.map((row) => ({
          id: row.productID, name: row.name, sku: row.sku, image_url: row.imageUrl, stock_quantity: Number(row.stockQuantity),
        })),
        recent_orders: recentOrders.data,
        recent_activity: activity.map((row) => ({
          action: row.action, description: row.description, at: row.userActivityLogTime,
        })),
      },
    });
  } catch (err) {
    return sendServerError(res, 'getDashboard', err);
  }
}

module.exports = {
  getMyStatus, apply, getProfile, updateProfile, updateLogo, getDashboard, mapSeller,
};
