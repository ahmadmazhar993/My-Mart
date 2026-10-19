const { StatusCodes } = require('http-status-codes');
const db = require('../../../db');
const orderEvents = require('../../../libs/orderEvents');
const realtime = require('../../../libs/realtime');
const { syncOrderStatusFromFulfillment } = require('../../../libs/orderStatus');
const { sendOrderStatusEmail } = require('../../../email/templates');
const {
  isUuid, escapeLike, parsePagination, buildPagination, sendError, sendServerError, audit, parseDateParam,
} = require('./seller.shared');

const STAGES = ['pending', 'processing', 'ready_to_ship', 'shipped'];

// A seller may only move items forward one step at a time. "Delivered" and
// "refunded" are admin-controlled order states and are not reachable here.
const PREVIOUS_STAGE = { processing: 'pending', ready_to_ship: 'processing', shipped: 'ready_to_ship' };

// The order itself must have been accepted by AHM Mart before sellers fulfil it.
const FULFILLABLE_ORDER_STATUSES = ['confirmed', 'processing', 'shipped'];

const mapOrderSummary = (row) => ({
  id: row.orderID,
  order_code: row.orderCode,
  created_at: row.createdOn,
  order_status: row.status,
  payment_status: row.paymentStatus,
  payment_method: row.paymentMethod,
  customer_name: row.status === 'cancelled' ? null : `${row.firstName || ''} ${row.lastName || ''}`.trim() || 'Customer',
  items_count: Number(row.lines),
  units: Number(row.units),
  // Only this seller's share of the order — never the order total.
  seller_subtotal: Number(row.subtotal),
  fulfillment_status: STAGES[Number(row.stage)] || 'pending',
});

/**
 * Orders containing at least one item sold by `sellerID`. Aggregates only that
 * seller's items, which is what keeps other sellers' lines out of the result.
 * Shared with the admin "seller orders" view.
 */
async function querySellerOrders(sellerID, query) {
  const pg = parsePagination(query);
  const search = String(query.search || '').trim();
  const from = parseDateParam(query.from) ? query.from : null;
  const to = parseDateParam(query.to) ? query.to : null;

  const itemAgg = db('order_items as oi')
    .where('oi.seller_id', sellerID)
    .groupBy('oi.order_id')
    .select(
      'oi.order_id',
      db.raw('SUM(oi."totalPrice") AS subtotal'),
      db.raw('SUM(oi.quantity) AS units'),
      db.raw('COUNT(*) AS lines'),
      db.raw('MIN(CASE oi."fulfillmentStatus" WHEN \'pending\' THEN 0 WHEN \'processing\' THEN 1 WHEN \'ready_to_ship\' THEN 2 ELSE 3 END) AS stage')
    )
    .as('s');

  const base = db('orders as o')
    .join(itemAgg, 's.order_id', 'o.orderID')
    .leftJoin('user as u', 'u.userID', 'o.user_id');

  if (search) base.whereRaw('o."orderCode" ILIKE ?', [`%${escapeLike(search)}%`]);
  if (['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].includes(query.status)) {
    base.where('o.status', query.status);
  }
  if (STAGES.includes(query.fulfillment)) base.whereRaw('s.stage = ?', [STAGES.indexOf(query.fulfillment)]);
  if (from) base.whereRaw('o."createdOn"::date >= ?::date', [from]);
  if (to) base.whereRaw('o."createdOn"::date <= ?::date', [to]);

  const totalRow = await base.clone().clearSelect().count({ total: '*' }).first();
  const rows = await base.clone()
    .select('o.orderID', 'o.orderCode', 'o.createdOn', 'o.status', 'o.paymentStatus', 'o.paymentMethod',
      'u.firstName', 'u.lastName', 's.subtotal', 's.units', 's.lines', 's.stage')
    .orderBy('o.createdOn', 'desc')
    .orderBy('o.orderID', 'asc')
    .limit(pg.limit)
    .offset(pg.offset);

  return { data: rows.map(mapOrderSummary), pagination: buildPagination(pg, Number(totalRow.total)) };
}

async function listOrders(req, res) {
  try {
    const result = await querySellerOrders(req.seller.sellerID, req.query);
    return res.json({ success: true, ...result });
  } catch (err) {
    return sendServerError(res, 'listOrders', err);
  }
}

async function loadOrderDetail(sellerID, orderID) {
  const order = await db('orders as o')
    .leftJoin('user as u', 'u.userID', 'o.user_id')
    .first('o.*', 'u.firstName', 'u.lastName', 'u.phoneNumber')
    .where('o.orderID', orderID)
    .whereExists(db('order_items').select(db.raw('1')).whereRaw('order_items.order_id = o."orderID"').where('order_items.seller_id', sellerID));
  if (!order) return null;

  // seller_id filter is the isolation boundary: other sellers' lines never leave the DB.
  const items = await db('order_items as oi')
    .leftJoin('products as p', 'p.productID', 'oi.product_id')
    .select('oi.*', 'p.name as productName', 'p.imageUrl as productImage')
    .where({ 'oi.order_id': orderID, 'oi.seller_id': sellerID })
    .orderBy('oi.createdOn', 'asc');

  const history = items.length
    ? await db('order_item_status_history')
      .whereIn('order_item_id', items.map((item) => item.orderItemID))
      .orderBy('createdOn', 'asc')
    : [];

  const cancelled = order.status === 'cancelled';
  return {
    id: order.orderID,
    order_code: order.orderCode,
    created_at: order.createdOn,
    order_status: order.status,
    payment_status: order.paymentStatus,
    payment_method: order.paymentMethod,
    // Delivery details are limited to what is needed to ship, and withheld once cancelled.
    delivery: cancelled ? null : {
      recipient: `${order.firstName || ''} ${order.lastName || ''}`.trim() || 'Customer',
      phone: order.phoneNumber || null,
      address: order.shippingAddress,
    },
    can_fulfil: !cancelled && FULFILLABLE_ORDER_STATUSES.includes(order.status)
      && (order.paymentMethod === 'cod' || order.paymentStatus === 'paid'),
    items: items.map((item) => ({
      id: item.orderItemID,
      product_id: item.product_id,
      name: item.productName,
      image_url: item.productImage,
      variant: item.variant_label || item.variant_name || null,
      sku: item.variant_sku,
      quantity: item.quantity,
      unit_price: Number(item.unitPrice),
      total_price: Number(item.totalPrice),
      fulfillment_status: item.fulfillmentStatus,
    })),
    seller_subtotal: items.reduce((sum, item) => sum + Number(item.totalPrice), 0),
    history: history.map((entry) => ({
      item_id: entry.order_item_id,
      from: entry.fromStatus,
      to: entry.toStatus,
      at: entry.createdOn,
    })),
  };
}

async function getOrder(req, res) {
  try {
    if (!isUuid(req.params.id)) return sendError(res, StatusCodes.NOT_FOUND, 'Order not found');
    const detail = await loadOrderDetail(req.seller.sellerID, req.params.id);
    if (!detail) return sendError(res, StatusCodes.NOT_FOUND, 'Order not found');
    return res.json({ success: true, data: detail });
  } catch (err) {
    return sendServerError(res, 'getOrder', err);
  }
}

async function updateFulfillment(req, res) {
  try {
    const { id } = req.params;
    const target = req.body?.status;
    if (!isUuid(id)) return sendError(res, StatusCodes.NOT_FOUND, 'Order not found');
    if (!PREVIOUS_STAGE[target]) {
      return sendError(res, StatusCodes.BAD_REQUEST, 'Status must be processing, ready_to_ship or shipped.');
    }

    const outcome = await db.transaction(async (trx) => {
      const order = await trx('orders').first('orderID', 'status', 'paymentStatus', 'paymentMethod', 'user_id').where({ orderID: id }).forUpdate();
      // Lock only this seller's lines.
      const items = order
        ? await trx('order_items').where({ order_id: id, seller_id: req.seller.sellerID }).forUpdate()
        : [];
      if (!order || items.length === 0) return { code: StatusCodes.NOT_FOUND, message: 'Order not found' };

      if (!FULFILLABLE_ORDER_STATUSES.includes(order.status)) {
        return { code: StatusCodes.CONFLICT, message: `This order is ${order.status} and cannot be fulfilled yet.` };
      }
      if (order.paymentMethod !== 'cod' && order.paymentStatus !== 'paid') {
        return { code: StatusCodes.CONFLICT, message: 'Payment for this order has not been confirmed yet.' };
      }

      const movable = items.filter((item) => item.fulfillmentStatus === PREVIOUS_STAGE[target]);
      if (movable.length === 0) {
        return { code: StatusCodes.CONFLICT, message: 'No items are ready for that step.' };
      }

      await trx('order_items')
        .whereIn('orderItemID', movable.map((item) => item.orderItemID))
        .update({ fulfillmentStatus: target, updatedOn: trx.fn.now() });
      await trx('order_item_status_history').insert(movable.map((item) => ({
        order_item_id: item.orderItemID,
        fromStatus: item.fulfillmentStatus,
        toStatus: target,
        actor_user_id: req.activeUser.userID,
      })));
      // Overall order status follows the fulfillment records (shipped only when ALL items are).
      const derived = await syncOrderStatusFromFulfillment(trx, id);
      return { moved: movable.length, derived, userId: order.user_id };
    });

    if (outcome.code) return sendError(res, outcome.code, outcome.message);

    await audit({
      entity: 'SellerOrder', targetID: id, action: 'Fulfillment', description: `Moved ${outcome.moved} item(s) to ${target}`, userID: req.activeUser.userID, data: { status: target },
    });
    try {
      orderEvents.emit('orders-updated', { type: 'orders-updated', orderId: id });
    } catch {
      // realtime hint only
    }
    if (outcome.derived) {
      realtime.emitOrder(id, 'status', {
        customer: `Your order is now ${outcome.derived.to}.`,
        seller: `Order is now ${outcome.derived.to}.`,
        admin: `Order is now ${outcome.derived.to} (all sellers dispatched).`,
      });
      if (outcome.derived.to === 'shipped') {
        db('user').first('email', 'firstName').where({ userID: outcome.userId }).then((u) => u?.email && db('orders').first('orderCode').where({ orderID: id }).then((o) => sendOrderStatusEmail({
          email: u.email, firstName: u.firstName || 'Customer', orderId: o?.orderCode || id, status: 'shipped', previousStatus: outcome.derived.from,
        }))).catch(() => {});
      }
    }
    realtime.emitOrder(id, 'fulfillment', {
      admin: `A seller marked items ${target.replace(/_/g, ' ')}.`,
      customer: target === 'shipped' ? 'Part of your order has shipped.' : null,
    });
    const detail = await loadOrderDetail(req.seller.sellerID, id);
    return res.json({ success: true, data: detail });
  } catch (err) {
    return sendServerError(res, 'updateFulfillment', err);
  }
}

module.exports = {
  listOrders, getOrder, updateFulfillment, querySellerOrders,
};
