/** Admin-only finance: commission settings, reports, seller balances, payouts. */
const { StatusCodes } = require('http-status-codes');
const db = require('../../../db');
const {
  getCurrentRate, getSellerBalances, balanceSelects, mapBalanceRow, FinanceError, MIN_RATE_BPS, MAX_RATE_BPS,
} = require('../../../libs/ledger');
const { fromCents } = require('../../../libs/money');
const { notifySeller } = require('../../../libs/sellerNotify');
const realtime = require('../../../libs/realtime');
const {
  isUuid, escapeLike, parsePagination, buildPagination, sendError, sendServerError, audit, parseDateParam,
} = require('../seller/seller.shared');
const { mapPayout } = require('../seller/seller.finance');

const range = (query) => ({
  from: parseDateParam(query.from) ? query.from : null,
  to: parseDateParam(query.to) ? query.to : null,
});

/* ----------------------------- commission settings ----------------------------- */

const mapSetting = (row) => ({
  id: row.settingID,
  rate_percent: row.rateBps / 100,
  effective_from: row.effectiveFrom,
  note: row.note,
  set_by: row.adminName ? row.adminName.trim() || null : null,
});

async function getCommissionSettings(req, res) {
  try {
    const history = await db('commission_settings as c')
      .leftJoin('user as u', 'u.userID', 'c.createdBy')
      .select('c.*', db.raw('u."firstName" || \' \' || u."lastName" AS "adminName"'))
      .orderBy('c.effectiveFrom', 'desc')
      .orderBy('c.createdOn', 'desc')
      .limit(100);
    const { setting } = await getCurrentRate(db);
    const current = history.find((row) => row.settingID === setting.settingID);
    return res.json({
      success: true,
      data: {
        current: mapSetting(current),
        history: history.map(mapSetting),
        min_percent: MIN_RATE_BPS / 100,
        max_percent: MAX_RATE_BPS / 100,
        note: 'A new rate applies only to earnings posted after the change. Existing transactions keep the rate they were charged at.',
      },
    });
  } catch (err) {
    if (err instanceof FinanceError) return sendError(res, err.status, err.message);
    return sendServerError(res, 'admin.getCommissionSettings', err);
  }
}

async function setCommissionRate(req, res) {
  try {
    const percent = Number(req.body?.rate_percent);
    const bps = Math.round(percent * 100);
    if (!Number.isFinite(percent) || Math.abs(percent * 100 - bps) > 1e-6) {
      return sendError(res, StatusCodes.BAD_REQUEST, 'Rate must be a number with at most 2 decimal places.');
    }
    if (bps < MIN_RATE_BPS || bps > MAX_RATE_BPS) {
      return sendError(res, StatusCodes.BAD_REQUEST, `Rate must be between ${MIN_RATE_BPS / 100}% and ${MAX_RATE_BPS / 100}%.`);
    }
    const note = req.body?.note == null ? null : String(req.body.note).trim().slice(0, 300) || null;

    const [row] = await db('commission_settings').insert({ rateBps: bps, note, createdBy: req.activeUser.userID }, '*');
    await audit({
      entity: 'CommissionSettings', targetID: row.settingID, action: 'RateChange', description: `Commission rate set to ${percent}%`, userID: req.activeUser.userID, data: { rateBps: bps, note },
    });
    realtime.emitAllSellers('commission', { action: 'rate', messages: { seller: `The commission rate is now ${bps / 100}%.` } });
    return res.status(StatusCodes.CREATED).json({ success: true, data: { id: row.settingID, rate_percent: bps / 100, effective_from: row.effectiveFrom } });
  } catch (err) {
    return sendServerError(res, 'admin.setCommissionRate', err);
  }
}

/* ---------------------------------- reports ---------------------------------- */

async function overview(req, res) {
  try {
    const { from, to } = range(req.query);
    const base = db('seller_ledger_entries as l').leftJoin('orders as o', 'o.orderID', 'l.order_id');
    if (from) base.whereRaw('l."createdOn"::date >= ?::date', [from]);
    if (to) base.whereRaw('l."createdOn"::date <= ?::date', [to]);
    const [row, payouts, sellers] = await Promise.all([
      base.first(...balanceSelects(db)),
      db('payout_requests').select('status').sum({ total: 'amount' }).count({ n: '*' }).groupBy('status'),
      db('sellers').count({ n: '*' }).where({ status: 'approved' }).first(),
    ]);
    const byStatus = Object.fromEntries(payouts.map((p) => [p.status, { total: Number(p.total), count: Number(p.n) }]));
    return res.json({
      success: true,
      data: {
        range: { from, to },
        totals: mapBalanceRow(row, { completed: byStatus.completed?.total, requested: byStatus.requested?.total }),
        payouts: byStatus,
        approved_sellers: Number(sellers.n),
      },
    });
  } catch (err) {
    return sendServerError(res, 'admin.overview', err);
  }
}

// Commission earned (net of reversals) grouped by day, seller or order.
async function commissionReport(req, res) {
  try {
    const pg = parsePagination(req.query, { defaultLimit: 25 });
    const { from, to } = range(req.query);
    const group = ['day', 'seller', 'order'].includes(req.query.group) ? req.query.group : 'day';

    const base = db('seller_ledger_entries as l')
      .join('sellers as s', 's.sellerID', 'l.seller_id')
      .leftJoin('orders as o', 'o.orderID', 'l.order_id')
      .whereIn('l.entryType', ['sale_commission', 'commission_reversal']);
    if (isUuid(req.query.seller_id)) base.where('l.seller_id', req.query.seller_id);
    if (from) base.whereRaw('l."createdOn"::date >= ?::date', [from]);
    if (to) base.whereRaw('l."createdOn"::date <= ?::date', [to]);

    const columns = {
      day: { key: 'to_char(l."createdOn"::date, \'YYYY-MM-DD\')', label: 'to_char(l."createdOn"::date, \'YYYY-MM-DD\')', order: 'l."createdOn"::date DESC' },
      seller: { key: 's."sellerID"::text', label: 's."shopName"', order: 'SUM(-l.amount) DESC' },
      order: { key: 'o."orderID"::text', label: 'o."orderCode"', order: 'MAX(l."createdOn") DESC' },
    }[group];

    const grouped = base.clone().groupByRaw(`${columns.key}, ${columns.label}${group === 'day' ? ', l."createdOn"::date' : ''}`);
    const totalRow = await db.from(grouped.clone().select(db.raw(`${columns.key} AS k`)).as('g')).count({ total: '*' }).first();
    const rows = await grouped.clone()
      .select(
        db.raw(`${columns.key} AS key`),
        db.raw(`${columns.label} AS label`),
        db.raw('COALESCE(SUM(l."commissionBase") FILTER (WHERE l."entryType" = \'sale_commission\'), 0) AS base'),
        db.raw('COALESCE(-SUM(l.amount), 0) AS commission')
      )
      .orderByRaw(columns.order)
      .limit(pg.limit)
      .offset(pg.offset);
    return res.json({
      success: true,
      group,
      data: rows.map((r) => ({ key: r.key, label: r.label, commission_base: Number(r.base), commission: Number(r.commission) })),
      pagination: buildPagination(pg, Number(totalRow.total)),
    });
  } catch (err) {
    return sendServerError(res, 'admin.commissionReport', err);
  }
}

async function listSellerBalances(req, res) {
  try {
    const pg = parsePagination(req.query);
    const search = String(req.query.search || '').trim();
    const base = db('sellers as s').where('s.status', '<>', 'rejected');
    if (search) base.whereRaw('s."shopName" ILIKE ?', [`%${escapeLike(search)}%`]);
    const totalRow = await base.clone().count({ total: '*' }).first();
    const sellers = await base.clone().select('s.sellerID', 's.shopName', 's.status').orderBy('s.shopName').limit(pg.limit).offset(pg.offset);
    const ids = sellers.map((s) => s.sellerID);

    const [ledgerRows, payoutRows] = ids.length ? await Promise.all([
      db('seller_ledger_entries as l').leftJoin('orders as o', 'o.orderID', 'l.order_id')
        .whereIn('l.seller_id', ids).groupBy('l.seller_id').select('l.seller_id', ...balanceSelects(db)),
      db('payout_requests').whereIn('seller_id', ids).groupBy('seller_id', 'status').select('seller_id', 'status').sum({ total: 'amount' }),
    ]) : [[], []];
    const ledgerBySeller = Object.fromEntries(ledgerRows.map((r) => [r.seller_id, r]));
    const payoutsBySeller = {};
    payoutRows.forEach((r) => { payoutsBySeller[r.seller_id] = { ...(payoutsBySeller[r.seller_id] || {}), [r.status]: Number(r.total) }; });
    const empty = {
      gross: 0, refunds: 0, order_refunds: 0, cancellations: 0, commission: 0, net: 0, pending: 0, delivered_net: 0, payouts_out: 0,
    };

    return res.json({
      success: true,
      data: sellers.map((s) => ({
        id: s.sellerID, shop_name: s.shopName, status: s.status,
        ...mapBalanceRow(ledgerBySeller[s.sellerID] || empty, payoutsBySeller[s.sellerID] || {}),
      })),
      pagination: buildPagination(pg, Number(totalRow.total)),
    });
  } catch (err) {
    return sendServerError(res, 'admin.listSellerBalances', err);
  }
}

async function getSellerFinance(req, res) {
  try {
    if (!isUuid(req.params.id)) return sendError(res, StatusCodes.NOT_FOUND, 'Seller not found');
    const seller = await db('sellers').first('sellerID', 'shopName', 'status').where({ sellerID: req.params.id });
    if (!seller) return sendError(res, StatusCodes.NOT_FOUND, 'Seller not found');
    const [balances, payouts, ledger] = await Promise.all([
      getSellerBalances(db, seller.sellerID),
      db('payout_requests').where({ seller_id: seller.sellerID }).orderBy('requestedOn', 'desc').limit(50),
      db('seller_ledger_entries as l').leftJoin('orders as o', 'o.orderID', 'l.order_id')
        .where('l.seller_id', seller.sellerID).orderBy('l.createdOn', 'desc').limit(50)
        .select('l.ledgerEntryID', 'l.entryType', 'l.reason', 'l.amount', 'l.commissionRateBps', 'l.commissionBase', 'l.createdOn', 'o.orderCode'),
    ]);
    return res.json({
      success: true,
      data: {
        seller: { id: seller.sellerID, shop_name: seller.shopName, status: seller.status },
        balances,
        payouts: payouts.map((p) => ({ ...mapPayout(p), reference: p.reference, admin_note: p.adminNote })),
        ledger: ledger.map((e) => ({
          id: e.ledgerEntryID, type: e.entryType, reason: e.reason, amount: Number(e.amount), order_code: e.orderCode,
          commission_rate_percent: e.commissionRateBps != null ? e.commissionRateBps / 100 : null,
          commission_base: e.commissionBase != null ? Number(e.commissionBase) : null, created_at: e.createdOn,
        })),
      },
    });
  } catch (err) {
    return sendServerError(res, 'admin.getSellerFinance', err);
  }
}

/* --------------------------------- payouts ---------------------------------- */

async function listPayouts(req, res) {
  try {
    const pg = parsePagination(req.query);
    const base = db('payout_requests as p').join('sellers as s', 's.sellerID', 'p.seller_id');
    if (['requested', 'completed', 'rejected', 'failed'].includes(req.query.status)) base.where('p.status', req.query.status);
    if (isUuid(req.query.seller_id)) base.where('p.seller_id', req.query.seller_id);
    const totalRow = await base.clone().count({ total: '*' }).first();
    const rows = await base.clone().select('p.*', 's.shopName')
      .orderByRaw('CASE p.status WHEN \'requested\' THEN 0 ELSE 1 END').orderBy('p.requestedOn', 'desc')
      .limit(pg.limit).offset(pg.offset);
    return res.json({
      success: true,
      data: rows.map((p) => ({
        ...mapPayout(p), reference: p.reference, admin_note: p.adminNote, seller_id: p.seller_id, shop_name: p.shopName,
      })),
      pagination: buildPagination(pg, Number(totalRow.total)),
    });
  } catch (err) {
    return sendServerError(res, 'admin.listPayouts', err);
  }
}

/**
 * Payout state machine (only admins):
 *   requested -> completed   (a real transfer was made; reference required)
 *   requested -> rejected    (money returned to the seller's balance)
 *   requested|completed -> failed (transfer failed/bounced; money returned)
 * Returning money is a new ledger entry; nothing is ever edited or deleted.
 */
async function processPayout(req, res, { action }) {
  try {
    if (!isUuid(req.params.id)) return sendError(res, StatusCodes.NOT_FOUND, 'Payout not found');
    const reference = String(req.body?.reference || '').trim();
    const reason = String(req.body?.reason || '').trim();
    if (action === 'complete' && (reference.length < 3 || reference.length > 120)) {
      return sendError(res, StatusCodes.BAD_REQUEST, 'Enter the transfer reference (3-120 characters).');
    }
    if (action !== 'complete' && (reason.length < 5 || reason.length > 300)) {
      return sendError(res, StatusCodes.BAD_REQUEST, 'Enter a reason (5-300 characters).');
    }
    const allowedFrom = { complete: ['requested'], reject: ['requested'], fail: ['requested', 'completed'] }[action];
    const toStatus = { complete: 'completed', reject: 'rejected', fail: 'failed' }[action];

    const payout = await db.transaction(async (trx) => {
      const current = await trx('payout_requests').first('*').where({ payoutID: req.params.id }).forUpdate();
      if (!current) throw new FinanceError('Payout not found', 404);
      if (!allowedFrom.includes(current.status)) throw new FinanceError(`This payout is already ${current.status}.`);
      const [updated] = await trx('payout_requests').where({ payoutID: current.payoutID }).update({
        status: toStatus,
        reference: action === 'complete' ? reference : current.reference,
        adminNote: action === 'complete' ? current.adminNote : reason,
        processedBy: req.activeUser.userID,
        processedOn: trx.fn.now(),
      }, '*');
      if (action !== 'complete') {
        await trx('seller_ledger_entries').insert({
          seller_id: current.seller_id,
          payout_id: current.payoutID,
          entryType: 'payout_reversal',
          reason: action === 'reject' ? 'payout_rejected' : 'payout_failed',
          amount: fromCents(Math.round(Number(current.amount) * 100)),
          idempotencyKey: `payoutrev:${current.payoutID}`,
          createdBy: req.activeUser.userID,
          metadata: { reason },
        });
      }
      return updated;
    });

    await audit({
      entity: 'SellerPayout', targetID: payout.payoutID, action: `Payout${action[0].toUpperCase()}${action.slice(1)}`,
      description: `Payout of Rs. ${payout.amount} marked ${toStatus}`, userID: req.activeUser.userID, data: { reference, reason },
    });
    notifySeller(payout.seller_id, 'payouts', {
      subject: `Payout ${toStatus} – AHM Mart`,
      title: `Your payout request was ${toStatus}`,
      lines: [action === 'complete' ? 'AHM Mart has recorded your payout as paid.' : `Your payout request was ${toStatus}. The amount is back in your available balance.`],
      dictionary: { Amount: `Rs. ${payout.amount}`, ...(action === 'complete' ? { Reference: reference } : { Reason: reason }) },
      path: '/seller/earnings',
      buttonText: 'View earnings',
    });
    realtime.emitSeller(payout.seller_id, 'payout', {
      id: payout.payoutID,
      action: toStatus,
      messages: { seller: action === 'complete' ? 'Your payout was marked as paid.' : `Your payout request was ${toStatus}.` },
    });
    return res.json({ success: true, data: { ...mapPayout(payout), reference: payout.reference, admin_note: payout.adminNote } });
  } catch (err) {
    if (err instanceof FinanceError) return sendError(res, err.status, err.message);
    return sendServerError(res, `admin.payout.${action}`, err);
  }
}

module.exports = {
  getCommissionSettings,
  setCommissionRate,
  overview,
  commissionReport,
  listSellerBalances,
  getSellerFinance,
  listPayouts,
  completePayout: (req, res) => processPayout(req, res, { action: 'complete' }),
  rejectPayout: (req, res) => processPayout(req, res, { action: 'reject' }),
  failPayout: (req, res) => processPayout(req, res, { action: 'fail' }),
};
