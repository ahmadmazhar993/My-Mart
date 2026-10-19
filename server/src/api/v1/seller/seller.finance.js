const { StatusCodes } = require('http-status-codes');
const db = require('../../../db');
const {
  getSellerBalances, getCurrentRate, FinanceError,
} = require('../../../libs/ledger');
const realtime = require('../../../libs/realtime');
const { toCents, fromCents } = require('../../../libs/money');
const {
  isUuid, escapeLike, parsePagination, buildPagination, sendError, sendServerError, audit, parseDateParam,
} = require('./seller.shared');

const rangeOf = (query) => ({
  from: parseDateParam(query.from) ? query.from : null,
  to: parseDateParam(query.to) ? query.to : null,
});

/** Public: the fee policy exactly as currently configured (used on the application page). */
async function getFeePolicy(req, res) {
  try {
    const { rateBps } = await getCurrentRate(db);
    return res.json({
      success: true,
      data: {
        commission_percent: rateBps / 100,
        registration_fee: 0,
        monthly_fee: 0,
        listing_fee: 0,
        commission_base: 'original product price before discounts',
        delivery_charges_in_commission: false,
      },
    });
  } catch (err) {
    // Never show a guessed rate if the configuration is broken.
    return sendServerError(res, 'getFeePolicy', err);
  }
}

async function getEarnings(req, res) {
  try {
    const range = rangeOf(req.query);
    const [all, period, rate] = await Promise.all([
      getSellerBalances(db, req.seller.sellerID),
      range.from || range.to ? getSellerBalances(db, req.seller.sellerID, range) : null,
      getCurrentRate(db),
    ]);
    return res.json({
      success: true,
      data: {
        currency: 'PKR',
        balances: all,
        period: period || all,
        range,
        current_commission_percent: rate.rateBps / 100,
        definitions: {
          gross_product_sales: 'Discounted product amount customers paid for your items (delivery excluded).',
          commission_charged: 'AHM Mart commission on the original product price before discounts, net of reversals.',
          net_earnings: 'Gross product sales minus refunds, cancellations and commission.',
          pending_earnings: 'Net earnings on paid orders that are not delivered yet.',
          available_balance: 'Net earnings on delivered orders minus payouts requested or paid.',
        },
      },
    });
  } catch (err) {
    return sendServerError(res, 'getEarnings', err);
  }
}

/** Order-line breakdown so a seller can see exactly how each commission was calculated. */
async function listTransactions(req, res) {
  try {
    const pg = parsePagination(req.query);
    const search = String(req.query.search || '').trim();
    const { from, to } = rangeOf(req.query);

    const base = db('seller_ledger_entries as l')
      .join('order_items as oi', 'oi.orderItemID', 'l.order_item_id')
      .join('orders as o', 'o.orderID', 'oi.order_id')
      .leftJoin('products as p', 'p.productID', 'oi.product_id')
      .where('l.seller_id', req.seller.sellerID);
    if (search) base.whereRaw('o."orderCode" ILIKE ?', [`%${escapeLike(search)}%`]);
    if (['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].includes(req.query.status)) base.where('o.status', req.query.status);
    if (from) base.whereRaw('l."createdOn"::date >= ?::date', [from]);
    if (to) base.whereRaw('l."createdOn"::date <= ?::date', [to]);

    const grouped = base.clone().groupBy('oi.orderItemID', 'o.orderID', 'o.orderCode', 'o.status', 'o.paymentStatus', 'p.name');
    const totalRow = await db.from(grouped.clone().select('oi.orderItemID').as('g')).count({ total: '*' }).first();

    const rows = await grouped.clone()
      .select(
        'oi.orderItemID', 'o.orderID', 'o.orderCode', 'o.status', 'o.paymentStatus', 'p.name as productName',
        'oi.quantity', 'oi.unitPrice',
        db.raw('COALESCE(oi."originalUnitPrice", oi."unitPrice") AS "originalUnitPrice"'),
        db.raw('MIN(l."createdOn") AS "postedOn"'),
        db.raw('COALESCE(SUM(l."commissionBase") FILTER (WHERE l."entryType" = \'sale_commission\'), 0) AS base'),
        db.raw('(array_agg(l."commissionRateBps" ORDER BY l."createdOn" DESC) FILTER (WHERE l."entryType" = \'sale_commission\'))[1] AS "rateBps"'),
        db.raw('COALESCE(SUM(l.amount) FILTER (WHERE l."entryType" = \'sale_earnings_credit\'), 0) AS gross'),
        db.raw('COALESCE(-SUM(l.amount) FILTER (WHERE l."entryType" IN (\'sale_commission\', \'commission_reversal\')), 0) AS commission'),
        db.raw('COALESCE(-SUM(l.amount) FILTER (WHERE l."entryType" = \'refund_adjustment\'), 0) AS reversed'),
        db.raw('COALESCE(SUM(l.amount), 0) AS net')
      )
      .orderByRaw('MIN(l."createdOn") DESC')
      .orderBy('oi.orderItemID')
      .limit(pg.limit)
      .offset(pg.offset);

    return res.json({
      success: true,
      data: rows.map((row) => ({
        order_id: row.orderID,
        order_code: row.orderCode,
        product: row.productName,
        quantity: row.quantity,
        unit_price: Number(row.unitPrice),
        original_unit_price: Number(row.originalUnitPrice),
        commission_base: Number(row.base),
        commission_rate_percent: row.rateBps != null ? row.rateBps / 100 : null,
        gross: Number(row.gross),
        commission: Number(row.commission),
        refunds_and_cancellations: Number(row.reversed),
        net: Number(row.net),
        order_status: row.status,
        payment_status: row.paymentStatus,
        posted_on: row.postedOn,
      })),
      pagination: buildPagination(pg, Number(totalRow.total)),
    });
  } catch (err) {
    return sendServerError(res, 'listTransactions', err);
  }
}

const TYPE_LABEL = {
  sale_earnings_credit: 'Sale earnings',
  sale_commission: 'Commission',
  commission_reversal: 'Commission reversal',
  refund_adjustment: 'Refund / cancellation adjustment',
  payout: 'Payout',
  payout_reversal: 'Payout reversal',
};

async function listLedger(req, res) {
  try {
    const pg = parsePagination(req.query, { defaultLimit: 25 });
    const { from, to } = rangeOf(req.query);
    const base = db('seller_ledger_entries as l')
      .leftJoin('orders as o', 'o.orderID', 'l.order_id')
      .where('l.seller_id', req.seller.sellerID);
    if (Object.keys(TYPE_LABEL).includes(req.query.type)) base.where('l.entryType', req.query.type);
    if (from) base.whereRaw('l."createdOn"::date >= ?::date', [from]);
    if (to) base.whereRaw('l."createdOn"::date <= ?::date', [to]);
    const totalRow = await base.clone().count({ total: '*' }).first();
    const rows = await base.clone()
      .select('l.*', 'o.orderCode')
      .orderBy('l.createdOn', 'desc')
      .orderBy('l.ledgerEntryID', 'asc')
      .limit(pg.limit)
      .offset(pg.offset);
    return res.json({
      success: true,
      data: rows.map((row) => ({
        id: row.ledgerEntryID,
        type: row.entryType,
        label: TYPE_LABEL[row.entryType],
        reason: row.reason,
        order_code: row.orderCode,
        amount: Number(row.amount),
        commission_rate_percent: row.commissionRateBps != null ? row.commissionRateBps / 100 : null,
        commission_base: row.commissionBase != null ? Number(row.commissionBase) : null,
        created_at: row.createdOn,
      })),
      pagination: buildPagination(pg, Number(totalRow.total)),
    });
  } catch (err) {
    return sendServerError(res, 'listLedger', err);
  }
}

const mapPayout = (row) => ({
  id: row.payoutID,
  amount: Number(row.amount),
  currency: row.currency,
  status: row.status,
  seller_note: row.sellerNote,
  reference: row.status === 'completed' ? row.reference : null,
  admin_note: ['rejected', 'failed'].includes(row.status) ? row.adminNote : null,
  requested_on: row.requestedOn,
  processed_on: row.processedOn,
});

async function listPayouts(req, res) {
  try {
    const pg = parsePagination(req.query);
    const { from, to } = rangeOf(req.query);
    const base = db('payout_requests').where({ seller_id: req.seller.sellerID });
    if (['requested', 'completed', 'rejected', 'failed'].includes(req.query.status)) base.where('status', req.query.status);
    if (from) base.whereRaw('"requestedOn"::date >= ?::date', [from]);
    if (to) base.whereRaw('"requestedOn"::date <= ?::date', [to]);
    const totalRow = await base.clone().count({ total: '*' }).first();
    const rows = await base.clone().orderBy('requestedOn', 'desc').orderBy('payoutID', 'asc').limit(pg.limit).offset(pg.offset);
    return res.json({ success: true, data: rows.map(mapPayout), pagination: buildPagination(pg, Number(totalRow.total)) });
  } catch (err) {
    return sendServerError(res, 'listPayouts', err);
  }
}

/**
 * Payout request. Requires an Idempotency-Key header: a retry (double click,
 * network replay) returns the original request instead of creating a second one.
 * A "requested" payout reserves the money in the ledger; it is NOT a completed
 * payment until an administrator records the transfer.
 */
async function requestPayout(req, res) {
  try {
    const key = String(req.headers['idempotency-key'] || '').trim();
    if (!/^[A-Za-z0-9_-]{8,100}$/.test(key)) {
      return sendError(res, StatusCodes.BAD_REQUEST, 'An Idempotency-Key header (8-100 letters, numbers, - or _) is required.');
    }
    const amountNumber = Number(req.body?.amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0 || Math.abs(amountNumber * 100 - Math.round(amountNumber * 100)) > 1e-6) {
      return sendError(res, StatusCodes.BAD_REQUEST, 'Enter a valid amount greater than 0 (up to 2 decimals).');
    }
    const amountCents = toCents(amountNumber);
    const note = req.body?.note == null ? null : String(req.body.note).trim().slice(0, 300) || null;

    const out = await db.transaction(async (trx) => {
      // Serialize all balance-affecting work for this seller.
      await trx('sellers').where({ sellerID: req.seller.sellerID }).forUpdate().first('sellerID');

      const existing = await trx('payout_requests').first('*').where({ seller_id: req.seller.sellerID, idempotencyKey: key });
      if (existing) {
        if (toCents(existing.amount) !== amountCents) throw new FinanceError('This Idempotency-Key was already used for a different amount.');
        return { payout: existing, replay: true };
      }

      const balances = await getSellerBalances(trx, req.seller.sellerID);
      if (amountCents > toCents(balances.available_for_payout)) {
        throw new FinanceError(`Amount exceeds your available balance of Rs. ${balances.available_for_payout.toLocaleString('en-PK')}.`);
      }

      const [payout] = await trx('payout_requests').insert({
        seller_id: req.seller.sellerID,
        amount: fromCents(amountCents),
        idempotencyKey: key,
        sellerNote: note,
        requestedBy: req.activeUser.userID,
      }, '*');
      await trx('seller_ledger_entries').insert({
        seller_id: req.seller.sellerID,
        payout_id: payout.payoutID,
        entryType: 'payout',
        reason: 'payout_requested',
        amount: fromCents(-amountCents),
        idempotencyKey: `payout:${payout.payoutID}`,
        createdBy: req.activeUser.userID,
      });
      return { payout, replay: false };
    });

    if (!out.replay) {
      realtime.emitSeller(req.seller.sellerID, 'payout', { id: out.payout.payoutID, action: 'requested', messages: { admin: 'New payout request.' } });
      await audit({
        entity: 'SellerPayout', targetID: out.payout.payoutID, action: 'PayoutRequest', description: `Requested payout of Rs. ${out.payout.amount}`, userID: req.activeUser.userID, data: { amount: out.payout.amount },
      });
    }
    return res.status(out.replay ? StatusCodes.OK : StatusCodes.CREATED).json({ success: true, data: mapPayout(out.payout), replay: out.replay });
  } catch (err) {
    if (err instanceof FinanceError) return sendError(res, err.status, err.message);
    return sendServerError(res, 'requestPayout', err);
  }
}

module.exports = {
  getFeePolicy, getEarnings, listTransactions, listLedger, listPayouts, requestPayout, mapPayout, isUuid,
};
