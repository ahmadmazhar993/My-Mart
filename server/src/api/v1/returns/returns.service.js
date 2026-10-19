/**
 * Returns and refunds.
 *   customer : requests a return for a delivered item, can message and cancel while requested
 *   seller   : sees returns for their own items, replies, records receipt/inspection once approved
 *   admin    : makes the final decision and is the only one who can complete a refund
 *
 * Money rule: a refund is only "done" when an admin completes it. That is the single
 * place that posts the ledger reversal, so a seller cannot refund or alter refund status.
 */
const { StatusCodes } = require('http-status-codes');
const db = require('../../../db');
const { reverseItemRefund, FinanceError } = require('../../../libs/ledger');
const { toCents, fromCents } = require('../../../libs/money');
const { notifySeller } = require('../../../libs/sellerNotify');
const realtime = require('../../../libs/realtime');
const {
  isUuid, escapeLike, parsePagination, buildPagination, sendError, sendServerError, audit,
} = require('../seller/seller.shared');

const REASONS = ['damaged', 'defective', 'wrong_item', 'not_as_described', 'other'];
const EVIDENCE_PATH = /^uploads\/returns\/[A-Za-z0-9._-]+$/;
// Statuses that still "hold" quantity against the order item.
const ACTIVE = ['requested', 'approved', 'received', 'refunded'];

const getReturnWindowDays = async (trx = db) => {
  const row = await trx('marketplace_settings').first('value').where({ key: 'return_window_days' });
  const days = row ? parseInt(row.value, 10) : NaN;
  return Number.isInteger(days) && days >= 0 ? days : 7;
};

const initials = (first, last) => `${first || ''} ${last ? `${last[0]}.` : ''}`.trim() || 'Customer';

const mapReturn = (row, { audience, messages } = {}) => ({
  id: row.returnID,
  order_id: row.order_id,
  order_code: row.orderCode,
  product: row.productName,
  quantity: row.quantity,
  unit_price: row.unitPrice != null ? Number(row.unitPrice) : undefined,
  max_refund: row.unitPrice != null ? Number(row.unitPrice) * row.quantity : undefined,
  reason: row.reason,
  details: row.details,
  evidence: Array.isArray(row.evidence) ? row.evidence : [],
  status: row.status,
  decision_note: row.decisionNote,
  inspection_note: row.inspectionNote,
  refund_amount: row.refundAmount != null ? Number(row.refundAmount) : null,
  customer: audience === 'customer' ? undefined : (audience === 'admin'
    ? { name: `${row.firstName || ''} ${row.lastName || ''}`.trim(), email: row.email }
    : { name: initials(row.firstName, row.lastName) }),
  shop_name: audience === 'admin' ? row.shopName : undefined,
  seller_id: audience === 'admin' ? row.seller_id : undefined,
  created_at: row.createdOn,
  decided_on: row.decidedOn,
  received_on: row.receivedOn,
  refunded_on: row.refundedOn,
  messages: messages ? messages.map((m) => ({
    id: m.messageID, role: m.authorRole, body: m.body, created_at: m.createdOn,
  })) : undefined,
});

const baseQuery = () => db('return_requests as r')
  .join('orders as o', 'o.orderID', 'r.order_id')
  .join('order_items as oi', 'oi.orderItemID', 'r.order_item_id')
  .join('sellers as s', 's.sellerID', 'r.seller_id')
  .join('user as u', 'u.userID', 'r.user_id')
  .leftJoin('products as p', 'p.productID', 'oi.product_id')
  .select('r.*', 'o.orderCode', 'oi.unitPrice', 'p.name as productName', 's.shopName', 'u.firstName', 'u.lastName', 'u.email');

const loadMessages = (returnId) => db('return_messages').where({ return_id: returnId }).orderBy('createdOn', 'asc');

const addMessage = async (trx, returnId, user, role, body) => trx('return_messages').insert({
  return_id: returnId, author_user_id: user.userID, authorRole: role, body,
});

const cleanBody = (value) => {
  const body = String(value || '').trim();
  return body.length >= 2 && body.length <= 1000 ? body : null;
};

/* -------------------------------- customer -------------------------------- */

async function createReturn(req, res) {
  try {
    const body = req.body || {};
    const errors = {};
    if (!isUuid(body.order_item_id)) errors.order_item_id = 'Choose the item to return.';
    const quantity = Number(body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) errors.quantity = 'Quantity must be a whole number of at least 1.';
    if (!REASONS.includes(body.reason)) errors.reason = 'Choose a reason.';
    const details = String(body.details || '').trim();
    if (details.length > 1000) errors.details = 'Details must be 1000 characters or fewer.';
    const evidence = Array.isArray(body.evidence) ? body.evidence : [];
    if (evidence.length > 5 || !evidence.every((p) => typeof p === 'string' && EVIDENCE_PATH.test(p))) {
      errors.evidence = 'Evidence must be up to 5 uploaded images.';
    }
    if (Object.keys(errors).length) return sendError(res, StatusCodes.BAD_REQUEST, Object.values(errors)[0], { errors });

    const created = await db.transaction(async (trx) => {
      const item = await trx('order_items as oi').join('orders as o', 'o.orderID', 'oi.order_id')
        .first('oi.*', 'o.user_id as customerId', 'o.status as orderStatus', 'o.deliveredOn', 'o.updatedOn as orderUpdated')
        .where('oi.orderItemID', body.order_item_id)
        .forUpdate('oi');
      // Someone else's item looks nonexistent.
      if (!item || item.customerId !== req.activeUser.userID) throw new FinanceError('Order item not found', 404);
      if (item.orderStatus !== 'delivered') throw new FinanceError('Only delivered orders can be returned.');

      const windowDays = await getReturnWindowDays(trx);
      const deliveredAt = new Date(item.deliveredOn || item.orderUpdated);
      if (Date.now() - deliveredAt.getTime() > windowDays * 86400000) {
        throw new FinanceError(`The ${windowDays}-day return window for this order has passed.`);
      }

      const used = await trx('return_requests').whereIn('status', ACTIVE).where({ order_item_id: item.orderItemID }).sum({ n: 'quantity' }).first();
      const remaining = Number(item.quantity) - Number(used.n || 0);
      if (quantity > remaining) {
        throw new FinanceError(remaining > 0 ? `You can return at most ${remaining} more of this item.` : 'This item has already been returned or has a pending return.');
      }

      const [row] = await trx('return_requests').insert({
        order_id: item.order_id,
        order_item_id: item.orderItemID,
        seller_id: item.seller_id,
        user_id: req.activeUser.userID,
        quantity,
        reason: body.reason,
        details: details || null,
        evidence: JSON.stringify(evidence),
      }, '*');
      if (details) await addMessage(trx, row.returnID, req.activeUser, 'customer', details);
      return row;
    });

    await audit({
      entity: 'Return', targetID: created.returnID, action: 'ReturnRequest', description: `Return requested (${body.reason})`, userID: req.activeUser.userID,
    });
    notifySeller(created.seller_id, 'returns', {
      subject: 'New return request – AHM Mart',
      title: 'A customer requested a return',
      lines: ['Our team will review it and make the final decision. You can reply to the customer and record the item when it arrives.'],
      dictionary: { Reason: body.reason.replace(/_/g, ' '), Quantity: quantity },
      path: `/seller/returns/${created.returnID}`,
      buttonText: 'View return',
    });
    realtime.emitReturn(created.returnID, 'created', { admin: 'New return request.', seller: 'A customer requested a return.' });
    return res.status(StatusCodes.CREATED).json({ success: true, data: { id: created.returnID, status: created.status } });
  } catch (err) {
    if (err instanceof FinanceError) return sendError(res, err.status, err.message);
    return sendServerError(res, 'createReturn', err);
  }
}

const uploadEvidence = (req, res) => res.json({ success: true, data: req.uploadedPaths });

async function listMyReturns(req, res) {
  try {
    const rows = await baseQuery().where('r.user_id', req.activeUser.userID).orderBy('r.createdOn', 'desc').limit(100);
    return res.json({ success: true, data: rows.map((r) => mapReturn(r, { audience: 'customer' })) });
  } catch (err) {
    return sendServerError(res, 'listMyReturns', err);
  }
}

// Customer view of the returns on one order (to show status next to each item).
async function listOrderReturns(req, res) {
  try {
    if (!isUuid(req.params.orderId)) return res.json({ success: true, data: [] });
    const rows = await baseQuery().where({ 'r.user_id': req.activeUser.userID, 'r.order_id': req.params.orderId }).orderBy('r.createdOn', 'desc');
    return res.json({ success: true, data: rows.map((r) => ({ ...mapReturn(r, { audience: 'customer' }), order_item_id: r.order_item_id })) });
  } catch (err) {
    return sendServerError(res, 'listOrderReturns', err);
  }
}

async function getMyReturn(req, res) {
  try {
    if (!isUuid(req.params.id)) return sendError(res, StatusCodes.NOT_FOUND, 'Return not found');
    const row = await baseQuery().first().where({ 'r.returnID': req.params.id, 'r.user_id': req.activeUser.userID });
    if (!row) return sendError(res, StatusCodes.NOT_FOUND, 'Return not found');
    return res.json({ success: true, data: mapReturn(row, { audience: 'customer', messages: await loadMessages(row.returnID) }) });
  } catch (err) {
    return sendServerError(res, 'getMyReturn', err);
  }
}

async function customerMessage(req, res) {
  try {
    const body = cleanBody(req.body?.body);
    if (!body) return sendError(res, StatusCodes.BAD_REQUEST, 'Write a message (2-1000 characters).');
    if (!isUuid(req.params.id)) return sendError(res, StatusCodes.NOT_FOUND, 'Return not found');
    const row = await db('return_requests').first('returnID', 'status').where({ returnID: req.params.id, user_id: req.activeUser.userID });
    if (!row) return sendError(res, StatusCodes.NOT_FOUND, 'Return not found');
    if (['cancelled', 'rejected', 'refunded'].includes(row.status)) return sendError(res, StatusCodes.CONFLICT, 'This return is closed.');
    await addMessage(db, row.returnID, req.activeUser, 'customer', body);
    realtime.emitReturn(row.returnID, 'message');
    return res.status(StatusCodes.CREATED).json({ success: true });
  } catch (err) {
    return sendServerError(res, 'customerMessage', err);
  }
}

async function cancelMyReturn(req, res) {
  try {
    if (!isUuid(req.params.id)) return sendError(res, StatusCodes.NOT_FOUND, 'Return not found');
    const updated = await db('return_requests')
      .where({ returnID: req.params.id, user_id: req.activeUser.userID, status: 'requested' })
      .update({ status: 'cancelled', updatedOn: db.fn.now() });
    if (!updated) return sendError(res, StatusCodes.CONFLICT, 'Only a return that has not been reviewed can be cancelled.');
    await audit({
      entity: 'Return', targetID: req.params.id, action: 'ReturnCancel', description: 'Customer cancelled return', userID: req.activeUser.userID,
    });
    realtime.emitReturn(req.params.id, 'cancelled', { admin: 'A return request was cancelled.', seller: 'A customer cancelled a return request.' });
    return res.json({ success: true });
  } catch (err) {
    return sendServerError(res, 'cancelMyReturn', err);
  }
}

/* --------------------------------- seller --------------------------------- */

async function sellerList(req, res) {
  try {
    const pg = parsePagination(req.query);
    const base = baseQuery().where('r.seller_id', req.seller.sellerID);
    if (['requested', 'approved', 'rejected', 'received', 'refunded', 'cancelled'].includes(req.query.status)) base.where('r.status', req.query.status);
    const search = String(req.query.search || '').trim();
    if (search) base.whereRaw('o."orderCode" ILIKE ?', [`%${escapeLike(search)}%`]);
    const totalRow = await base.clone().clearSelect().count({ total: '*' }).first();
    const rows = await base.clone().orderBy('r.createdOn', 'desc').limit(pg.limit).offset(pg.offset);
    return res.json({ success: true, data: rows.map((r) => mapReturn(r, { audience: 'seller' })), pagination: buildPagination(pg, Number(totalRow.total)) });
  } catch (err) {
    return sendServerError(res, 'seller.returns.list', err);
  }
}

async function sellerGet(req, res) {
  try {
    if (!isUuid(req.params.id)) return sendError(res, StatusCodes.NOT_FOUND, 'Return not found');
    const row = await baseQuery().first().where({ 'r.returnID': req.params.id, 'r.seller_id': req.seller.sellerID });
    if (!row) return sendError(res, StatusCodes.NOT_FOUND, 'Return not found');
    return res.json({ success: true, data: mapReturn(row, { audience: 'seller', messages: await loadMessages(row.returnID) }) });
  } catch (err) {
    return sendServerError(res, 'seller.returns.get', err);
  }
}

async function sellerMessage(req, res) {
  try {
    const body = cleanBody(req.body?.body);
    if (!body) return sendError(res, StatusCodes.BAD_REQUEST, 'Write a message (2-1000 characters).');
    if (!isUuid(req.params.id)) return sendError(res, StatusCodes.NOT_FOUND, 'Return not found');
    const row = await db('return_requests').first('returnID', 'status').where({ returnID: req.params.id, seller_id: req.seller.sellerID });
    if (!row) return sendError(res, StatusCodes.NOT_FOUND, 'Return not found');
    if (['cancelled', 'rejected', 'refunded'].includes(row.status)) return sendError(res, StatusCodes.CONFLICT, 'This return is closed.');
    await addMessage(db, row.returnID, req.activeUser, 'seller', body);
    realtime.emitReturn(row.returnID, 'message');
    return res.status(StatusCodes.CREATED).json({ success: true });
  } catch (err) {
    return sendServerError(res, 'seller.returns.message', err);
  }
}

// Seller records that the returned item arrived (and what condition it was in). Only after admin approval.
async function sellerReceive(req, res) {
  try {
    const note = String(req.body?.note || '').trim();
    if (note.length < 3 || note.length > 500) return sendError(res, StatusCodes.BAD_REQUEST, 'Describe the item condition (3-500 characters).');
    if (!isUuid(req.params.id)) return sendError(res, StatusCodes.NOT_FOUND, 'Return not found');
    const updated = await db('return_requests')
      .where({ returnID: req.params.id, seller_id: req.seller.sellerID, status: 'approved' })
      .update({
        status: 'received', inspectionNote: note, receivedBy: req.activeUser.userID, receivedOn: db.fn.now(), updatedOn: db.fn.now(),
      });
    if (!updated) return sendError(res, StatusCodes.CONFLICT, 'Only returns approved by AHM Mart can be marked as received.');
    await audit({
      entity: 'Return', targetID: req.params.id, action: 'ReturnReceived', description: 'Seller recorded returned item', userID: req.activeUser.userID, data: { note },
    });
    realtime.emitReturn(req.params.id, 'received', { admin: 'A seller recorded a returned item.', customer: 'Your returned item was received by the seller.' });
    return res.json({ success: true });
  } catch (err) {
    return sendServerError(res, 'seller.returns.receive', err);
  }
}

/* ---------------------------------- admin --------------------------------- */

async function adminList(req, res) {
  try {
    const pg = parsePagination(req.query);
    const base = baseQuery();
    if (['requested', 'approved', 'rejected', 'received', 'refunded', 'cancelled'].includes(req.query.status)) base.where('r.status', req.query.status);
    if (isUuid(req.query.seller_id)) base.where('r.seller_id', req.query.seller_id);
    const search = String(req.query.search || '').trim();
    if (search) base.whereRaw('o."orderCode" ILIKE ?', [`%${escapeLike(search)}%`]);
    const totalRow = await base.clone().clearSelect().count({ total: '*' }).first();
    const rows = await base.clone()
      .orderByRaw('CASE r.status WHEN \'requested\' THEN 0 WHEN \'received\' THEN 1 WHEN \'approved\' THEN 2 ELSE 3 END')
      .orderBy('r.createdOn', 'desc').limit(pg.limit).offset(pg.offset);
    return res.json({ success: true, data: rows.map((r) => mapReturn(r, { audience: 'admin' })), pagination: buildPagination(pg, Number(totalRow.total)) });
  } catch (err) {
    return sendServerError(res, 'admin.returns.list', err);
  }
}

async function adminGet(req, res) {
  try {
    if (!isUuid(req.params.id)) return sendError(res, StatusCodes.NOT_FOUND, 'Return not found');
    const row = await baseQuery().first().where({ 'r.returnID': req.params.id });
    if (!row) return sendError(res, StatusCodes.NOT_FOUND, 'Return not found');
    return res.json({ success: true, data: mapReturn(row, { audience: 'admin', messages: await loadMessages(row.returnID) }) });
  } catch (err) {
    return sendServerError(res, 'admin.returns.get', err);
  }
}

async function adminMessage(req, res) {
  try {
    const body = cleanBody(req.body?.body);
    if (!body) return sendError(res, StatusCodes.BAD_REQUEST, 'Write a message (2-1000 characters).');
    if (!isUuid(req.params.id)) return sendError(res, StatusCodes.NOT_FOUND, 'Return not found');
    const row = await db('return_requests').first('returnID').where({ returnID: req.params.id });
    if (!row) return sendError(res, StatusCodes.NOT_FOUND, 'Return not found');
    await addMessage(db, row.returnID, req.activeUser, 'admin', body);
    realtime.emitReturn(row.returnID, 'message');
    return res.status(StatusCodes.CREATED).json({ success: true });
  } catch (err) {
    return sendServerError(res, 'admin.returns.message', err);
  }
}

async function adminDecide(req, res, { approve }) {
  try {
    const note = String(req.body?.note || '').trim();
    if (!approve && (note.length < 5 || note.length > 500)) return sendError(res, StatusCodes.BAD_REQUEST, 'Give the customer a reason (5-500 characters).');
    if (!isUuid(req.params.id)) return sendError(res, StatusCodes.NOT_FOUND, 'Return not found');
    const [row] = await db('return_requests')
      .where({ returnID: req.params.id, status: 'requested' })
      .update({
        status: approve ? 'approved' : 'rejected', decisionNote: note || null, decidedBy: req.activeUser.userID, decidedOn: db.fn.now(), updatedOn: db.fn.now(),
      }, '*');
    if (!row) return sendError(res, StatusCodes.CONFLICT, 'Only a return awaiting review can be decided.');
    await addMessage(db, row.returnID, req.activeUser, 'admin', approve ? `Return approved.${note ? ` ${note}` : ''}` : `Return rejected: ${note}`);
    await audit({
      entity: 'Return', targetID: row.returnID, action: approve ? 'ReturnApprove' : 'ReturnReject', description: `Return ${approve ? 'approved' : 'rejected'}`, userID: req.activeUser.userID, data: { note },
    });
    notifySeller(row.seller_id, 'returns', {
      subject: `Return ${approve ? 'approved' : 'rejected'} – AHM Mart`,
      title: `A return was ${approve ? 'approved' : 'rejected'}`,
      lines: [approve ? 'Follow the return instructions and record the item when it arrives.' : 'No action is needed from you.'],
      path: `/seller/returns/${row.returnID}`,
      buttonText: 'View return',
    });
    realtime.emitReturn(row.returnID, approve ? 'approved' : 'rejected', {
      customer: approve ? 'Your return request was approved.' : 'Your return request was rejected.',
      seller: approve ? 'A return was approved. Record the item when it arrives.' : 'A return was rejected.',
    });
    return res.json({ success: true });
  } catch (err) {
    return sendServerError(res, 'admin.returns.decide', err);
  }
}

/** Completing a refund is the only action that posts the ledger reversal. */
async function adminRefund(req, res) {
  try {
    if (!isUuid(req.params.id)) return sendError(res, StatusCodes.NOT_FOUND, 'Return not found');
    const amountNumber = Number(req.body?.amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0 || Math.abs(amountNumber * 100 - Math.round(amountNumber * 100)) > 1e-6) {
      return sendError(res, StatusCodes.BAD_REQUEST, 'Enter a valid refund amount (up to 2 decimals).');
    }
    const refundCents = toCents(amountNumber);

    const out = await db.transaction(async (trx) => {
      const ret = await trx('return_requests').first('*').where({ returnID: req.params.id }).forUpdate();
      if (!ret) throw new FinanceError('Return not found', 404);
      if (!['approved', 'received'].includes(ret.status)) throw new FinanceError('Only an approved or received return can be refunded.');
      const item = await trx('order_items').first('unitPrice', 'order_id').where({ orderItemID: ret.order_item_id });
      const maxCents = toCents(item.unitPrice) * ret.quantity;
      if (refundCents > maxCents) throw new FinanceError(`Refund cannot exceed the product amount paid (Rs. ${fromCents(maxCents)}).`);

      const reversal = await reverseItemRefund(trx, ret.order_item_id, refundCents, {
        returnId: ret.returnID, quantity: ret.quantity, actorId: req.activeUser.userID,
      });
      const [updated] = await trx('return_requests').where({ returnID: ret.returnID }).update({
        status: 'refunded', refundAmount: fromCents(refundCents), refundedBy: req.activeUser.userID, refundedOn: trx.fn.now(), updatedOn: trx.fn.now(),
      }, '*');
      await addMessage(trx, ret.returnID, req.activeUser, 'admin', `Refund of Rs. ${fromCents(refundCents)} recorded.`);
      return { updated, reversal };
    });

    await audit({
      entity: 'Return', targetID: out.updated.returnID, action: 'ReturnRefund', description: `Refund of Rs. ${out.updated.refundAmount} completed`, userID: req.activeUser.userID, data: { amount: out.updated.refundAmount },
    });
    notifySeller(out.updated.seller_id, 'returns', {
      subject: 'Return refunded – AHM Mart',
      title: 'A return refund was completed',
      lines: ['The refunded amount and the proportional commission were adjusted in your earnings.'],
      dictionary: { Refund: `Rs. ${out.updated.refundAmount}` },
      path: '/seller/earnings',
      buttonText: 'View earnings',
    });
    realtime.emitReturn(out.updated.returnID, 'refunded', {
      customer: 'Your refund has been recorded.',
      seller: 'A return was refunded and your earnings were adjusted.',
    });
    realtime.emitSeller(out.updated.seller_id, 'earnings', { id: out.updated.returnID, action: 'refund' });
    return res.json({ success: true, data: { id: out.updated.returnID, status: out.updated.status, refund_amount: Number(out.updated.refundAmount), earnings_adjusted: out.reversal.reversed } });
  } catch (err) {
    if (err instanceof FinanceError) return sendError(res, err.status, err.message);
    return sendServerError(res, 'admin.returns.refund', err);
  }
}

async function getSettings(req, res) {
  try {
    return res.json({ success: true, data: { return_window_days: await getReturnWindowDays() } });
  } catch (err) {
    return sendServerError(res, 'admin.returns.settings', err);
  }
}

async function setReturnWindow(req, res) {
  try {
    const days = Number(req.body?.return_window_days);
    if (!Number.isInteger(days) || days < 0 || days > 90) return sendError(res, StatusCodes.BAD_REQUEST, 'Return window must be 0 to 90 days.');
    await db('marketplace_settings').insert({ key: 'return_window_days', value: String(days), updatedBy: req.activeUser.userID })
      .onConflict('key').merge({ value: String(days), updatedBy: req.activeUser.userID, updatedOn: db.fn.now() });
    await audit({
      entity: 'MarketplaceSettings', targetID: 'return_window_days', action: 'SettingChange', description: `Return window set to ${days} days`, userID: req.activeUser.userID,
    });
    return res.json({ success: true, data: { return_window_days: days } });
  } catch (err) {
    return sendServerError(res, 'admin.returns.setWindow', err);
  }
}

module.exports = {
  createReturn,
  uploadEvidence,
  listMyReturns,
  listOrderReturns,
  getMyReturn,
  customerMessage,
  cancelMyReturn,
  sellerList,
  sellerGet,
  sellerMessage,
  sellerReceive,
  adminList,
  adminGet,
  adminMessage,
  approve: (req, res) => adminDecide(req, res, { approve: true }),
  reject: (req, res) => adminDecide(req, res, { approve: false }),
  adminRefund,
  getSettings,
  setReturnWindow,
};
