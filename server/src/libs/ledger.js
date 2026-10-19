/**
 * Seller commission + earnings ledger.
 *
 * Rules (see also docs in the final report):
 *  - Earnings are posted when an order becomes PAID. For cash-on-delivery that is
 *    when AHM Mart marks the order delivered (which auto-marks it paid) or an admin
 *    records payment. A placed or merely confirmed COD order is never "paid".
 *  - Commission = original (pre-discount) unit price x quantity x active rate.
 *    Delivery charges are never part of the base. The rate used is snapshotted on
 *    the entry, so later rate changes never alter history.
 *  - Seller proceeds = discounted product amount (order_items.totalPrice).
 *    Order-level discounts do not exist today; if introduced they are assumed to be
 *    AHM Mart-funded (no effect on commission or proceeds) until the business decides.
 *  - Cancellations and refunds post opposite entries (never edits). Partial refunds
 *    reverse commission in proportion to the refunded amount.
 *  - Every posting has a deterministic idempotency key, so retries / duplicate
 *    status updates cannot double-post.
 *
 * All functions take a knex transaction and are meant to run inside the same
 * transaction as the order/refund/payout change that triggers them.
 */
const {
  toCents, fromCents, commissionCents, proportionalCents,
} = require('./money');

class FinanceError extends Error {
  constructor(message, status = 409) {
    super(message);
    this.name = 'FinanceError';
    this.status = status;
  }
}

const EARNINGS_TYPES = ['sale_earnings_credit', 'sale_commission', 'commission_reversal', 'refund_adjustment'];
const MIN_RATE_BPS = 1;
const MAX_RATE_BPS = 5000;

/** The commission rate in force now. A missing/invalid row is an error, never 0%. */
async function getCurrentRate(db) {
  const row = await db('commission_settings')
    .where('effectiveFrom', '<=', db.fn.now())
    .orderBy('effectiveFrom', 'desc')
    .orderBy('createdOn', 'desc')
    .first();
  const bps = row ? Number(row.rateBps) : NaN;
  if (!Number.isInteger(bps) || bps < MIN_RATE_BPS || bps > MAX_RATE_BPS) {
    throw new FinanceError('Commission rate is not configured correctly. Contact an administrator.', 500);
  }
  return { rateBps: bps, setting: row };
}

// Remaining credit / commission for one order item, from its entries.
async function itemPosition(trx, orderItemId) {
  const rows = await trx('seller_ledger_entries')
    .where({ order_item_id: orderItemId })
    .whereIn('entryType', EARNINGS_TYPES)
    .select('entryType', 'amount');
  let credit = 0; let commission = 0; let credits = 0;
  rows.forEach((row) => {
    const cents = toCents(row.amount);
    if (row.entryType === 'sale_earnings_credit') { credit += cents; credits += 1; }
    if (row.entryType === 'refund_adjustment') credit += cents; // negative
    if (row.entryType === 'sale_commission' || row.entryType === 'commission_reversal') commission -= cents;
  });
  return { creditCents: credit, commissionCents: commission, epoch: credits };
}

async function insertEntry(trx, entry) {
  const rows = await trx('seller_ledger_entries')
    .insert({
      currency: 'PKR', quantity: 0, ...entry,
    })
    .onConflict('idempotencyKey')
    .ignore()
    .returning('ledgerEntryID');
  return rows.length > 0;
}

/** Post earnings credit + commission for every item of a paid order (idempotent). */
async function postOrderEarnings(trx, orderId, { actorId = null } = {}) {
  const items = await trx('order_items').where({ order_id: orderId }).orderBy('orderItemID');
  if (items.length === 0) return { posted: 0 };
  const { rateBps } = await getCurrentRate(trx);
  let posted = 0;

  for (const item of items) {
    const position = await itemPosition(trx, item.orderItemID);
    if (position.creditCents > 0) continue; // earnings already active for this item

    const quantity = Number(item.quantity);
    const unitCents = toCents(item.unitPrice);
    // Original price is never below what was charged.
    const originalCents = Math.max(toCents(item.originalUnitPrice ?? item.unitPrice), unitCents);
    const baseCents = originalCents * quantity;
    const creditCents = unitCents * quantity;
    const feeCents = commissionCents(baseCents, rateBps);
    const key = `sale:${item.orderItemID}:${position.epoch}`;
    const common = {
      seller_id: item.seller_id, order_id: orderId, order_item_id: item.orderItemID, createdBy: actorId,
    };

    const created = await insertEntry(trx, {
      ...common,
      entryType: 'sale_earnings_credit',
      reason: 'order_paid',
      quantity,
      amount: fromCents(creditCents),
      idempotencyKey: key,
      metadata: { unitPrice: fromCents(unitCents), originalUnitPrice: fromCents(originalCents) },
    });
    if (created) {
      await insertEntry(trx, {
        ...common,
        entryType: 'sale_commission',
        reason: 'order_paid',
        quantity,
        commissionBase: fromCents(baseCents),
        commissionRateBps: rateBps,
        amount: fromCents(-feeCents),
        idempotencyKey: `commission:${item.orderItemID}:${position.epoch}`,
      });
      posted += 1;
    }
  }
  return { posted };
}

/** Reverse everything still active for the order (cancellation, order refund, payment reverted). */
async function reverseOrderEarnings(trx, orderId, { reason, actorId = null }) {
  const items = await trx('order_items').where({ order_id: orderId }).orderBy('orderItemID');
  let reversed = 0;
  for (const item of items) {
    const position = await itemPosition(trx, item.orderItemID);
    if (position.creditCents <= 0 && position.commissionCents <= 0) continue;
    const epoch = Math.max(0, position.epoch - 1);
    const common = {
      seller_id: item.seller_id, order_id: orderId, order_item_id: item.orderItemID, createdBy: actorId, reason,
    };
    if (position.creditCents > 0) {
      await insertEntry(trx, {
        ...common,
        entryType: 'refund_adjustment',
        quantity: -Number(item.quantity),
        amount: fromCents(-position.creditCents),
        idempotencyKey: `rev:${reason}:${item.orderItemID}:${epoch}`,
      });
    }
    if (position.commissionCents > 0) {
      await insertEntry(trx, {
        ...common,
        entryType: 'commission_reversal',
        amount: fromCents(position.commissionCents),
        idempotencyKey: `revc:${reason}:${item.orderItemID}:${epoch}`,
      });
    }
    reversed += 1;
  }
  return { reversed };
}

/**
 * Partial (or full) refund of one item, e.g. an approved return. Reverses the
 * seller's proceeds by the refunded amount and the commission proportionally.
 */
async function reverseItemRefund(trx, orderItemId, refundCents, { returnId, quantity, actorId = null }) {
  const item = await trx('order_items').where({ orderItemID: orderItemId }).first();
  if (!item) throw new FinanceError('Order item not found', 404);
  const position = await itemPosition(trx, orderItemId);
  if (position.creditCents <= 0) {
    // Nothing was ever posted (e.g. order not paid / pre-ledger order): nothing to reverse.
    return { reversed: false, reason: 'no_active_earnings' };
  }
  if (refundCents <= 0 || refundCents > position.creditCents) {
    throw new FinanceError('Refund exceeds what is still refundable for this item.');
  }
  const commissionBack = refundCents === position.creditCents
    ? position.commissionCents
    : proportionalCents(position.commissionCents, refundCents, position.creditCents);

  const common = {
    seller_id: item.seller_id, order_id: item.order_id, order_item_id: orderItemId, return_id: returnId, createdBy: actorId,
  };
  await insertEntry(trx, {
    ...common,
    entryType: 'refund_adjustment',
    reason: 'return_refund',
    quantity: -Number(quantity),
    amount: fromCents(-refundCents),
    idempotencyKey: `return:${returnId}`,
  });
  if (commissionBack > 0) {
    await insertEntry(trx, {
      ...common,
      entryType: 'commission_reversal',
      reason: 'return_refund',
      amount: fromCents(commissionBack),
      idempotencyKey: `returnc:${returnId}`,
    });
  }
  return { reversed: true, commissionBackCents: commissionBack };
}

/* -------------------------------------------------------------------------- */
/* Balances                                                                   */
/* -------------------------------------------------------------------------- */

/** Column list shared by the seller and admin balance queries (alias l = ledger, o = orders). */
const balanceSelects = (db) => {
  const earn = "l.\"entryType\" IN ('sale_earnings_credit', 'sale_commission', 'commission_reversal', 'refund_adjustment')";
  return [
    db.raw("COALESCE(SUM(l.amount) FILTER (WHERE l.\"entryType\" = 'sale_earnings_credit'), 0) AS gross"),
    db.raw("COALESCE(-SUM(l.amount) FILTER (WHERE l.\"entryType\" = 'refund_adjustment' AND l.reason = 'return_refund'), 0) AS refunds"),
    db.raw("COALESCE(-SUM(l.amount) FILTER (WHERE l.\"entryType\" = 'refund_adjustment' AND l.reason = 'order_refunded'), 0) AS order_refunds"),
    db.raw("COALESCE(-SUM(l.amount) FILTER (WHERE l.\"entryType\" = 'refund_adjustment' AND l.reason IN ('order_cancelled', 'payment_reverted')), 0) AS cancellations"),
    db.raw("COALESCE(-SUM(l.amount) FILTER (WHERE l.\"entryType\" IN ('sale_commission', 'commission_reversal')), 0) AS commission"),
    db.raw(`COALESCE(SUM(l.amount) FILTER (WHERE ${earn}), 0) AS net`),
    db.raw(`COALESCE(SUM(l.amount) FILTER (WHERE ${earn} AND o.status <> 'delivered'), 0) AS pending`),
    db.raw(`COALESCE(SUM(l.amount) FILTER (WHERE ${earn} AND o.status = 'delivered'), 0) AS delivered_net`),
    db.raw("COALESCE(-SUM(l.amount) FILTER (WHERE l.\"entryType\" IN ('payout', 'payout_reversal')), 0) AS payouts_out"),
  ];
};

/** Turns one row of balanceSelects() into the API shape. */
const mapBalanceRow = (row, payoutByStatus = {}) => {
  const available = Math.round((Number(row.delivered_net) - Number(row.payouts_out)) * 100) / 100;
  return {
    gross_product_sales: Number(row.gross),
    refunds: Number(row.refunds) + Number(row.order_refunds),
    cancellations: Number(row.cancellations),
    commission_charged: Number(row.commission),
    net_earnings: Number(row.net),
    pending_earnings: Number(row.pending),
    available_balance: available,
    available_for_payout: Math.max(0, available),
    paid_out: payoutByStatus.completed || 0,
    payout_requested: payoutByStatus.requested || 0,
  };
};

/**
 * Totals for a seller from the ledger.
 *  gross       : product proceeds credited (discounted amount)
 *  refunds     : proceeds reversed by refunds   |  cancellations : by cancelled/reverted orders
 *  commission  : commission charged, net of reversals
 *  net         : gross - refunds - cancellations - commission
 *  pending     : net earnings of orders not yet delivered
 *  available   : net earnings of delivered orders, minus payouts (requested + completed)
 */
async function getSellerBalances(db, sellerId, { from = null, to = null } = {}) {
  const base = db('seller_ledger_entries as l')
    .leftJoin('orders as o', 'o.orderID', 'l.order_id')
    .where('l.seller_id', sellerId);
  if (from) base.whereRaw('l."createdOn"::date >= ?::date', [from]);
  if (to) base.whereRaw('l."createdOn"::date <= ?::date', [to]);

  const row = await base.first(...balanceSelects(db));

  const payoutRows = await db('payout_requests')
    .where({ seller_id: sellerId })
    .select('status')
    .sum({ total: 'amount' })
    .groupBy('status');
  const payoutByStatus = Object.fromEntries(payoutRows.map((r) => [r.status, Number(r.total)]));

  return mapBalanceRow(row, payoutByStatus);
}

module.exports = {
  FinanceError,
  getCurrentRate,
  postOrderEarnings,
  reverseOrderEarnings,
  reverseItemRefund,
  getSellerBalances,
  balanceSelects,
  mapBalanceRow,
  MIN_RATE_BPS,
  MAX_RATE_BPS,
};
