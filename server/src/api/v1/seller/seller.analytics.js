const { StatusCodes } = require('http-status-codes');
const db = require('../../../db');
const { getSellerBalances } = require('../../../libs/ledger');
const { sendServerError, parseDateParam } = require('./seller.shared');

const DAY = 86400000;
const isoDay = (date) => date.toISOString().slice(0, 10);
const GRANULARITY = { day: 'day', week: 'week', month: 'month' };

const resolveRange = (query) => {
  const today = new Date();
  const toDate = parseDateParam(query.to) || new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  let fromDate = parseDateParam(query.from) || new Date(toDate.getTime() - 29 * DAY);
  if (fromDate > toDate) fromDate = toDate;
  if ((toDate - fromDate) / DAY > 730) fromDate = new Date(toDate.getTime() - 730 * DAY);
  const days = Math.round((toDate - fromDate) / DAY) + 1;
  return {
    from: isoDay(fromDate), to: isoDay(toDate), days,
    prevFrom: isoDay(new Date(fromDate.getTime() - days * DAY)), prevTo: isoDay(new Date(fromDate.getTime() - DAY)),
  };
};

// Per order line: what was refunded. Order-level refunds (paymentStatus = refunded) count the whole line,
// including legacy orders that predate the ledger; return refunds come from the ledger.
const REFUND_JOIN = `LEFT JOIN (
    SELECT order_item_id, -SUM(amount) AS amt FROM seller_ledger_entries
    WHERE "entryType" = 'refund_adjustment' AND reason IN ('return_refund', 'order_refunded')
    GROUP BY order_item_id
  ) ref ON ref.order_item_id = oi."orderItemID"`;
const REFUNDED = 'CASE WHEN o."paymentStatus" = \'refunded\' THEN oi."totalPrice" ELSE LEAST(oi."totalPrice", COALESCE(ref.amt, 0)) END';

const lines = (sellerId, from, to) => db('order_items as oi')
  .join('orders as o', 'o.orderID', 'oi.order_id')
  .joinRaw(REFUND_JOIN)
  .where('oi.seller_id', sellerId)
  .whereRaw('o."createdOn"::date >= ?::date', [from])
  .whereRaw('o."createdOn"::date <= ?::date', [to]);

async function totalsFor(sellerId, from, to) {
  const [sales, ledger] = await Promise.all([
    lines(sellerId, from, to).first(
      db.raw('COALESCE(SUM(oi."totalPrice") FILTER (WHERE o.status <> \'cancelled\'), 0) AS gross'),
      db.raw(`COALESCE(SUM(${REFUNDED}) FILTER (WHERE o.status <> 'cancelled'), 0) AS refunds`),
      db.raw('COUNT(DISTINCT o."orderID") FILTER (WHERE o.status <> \'cancelled\') AS orders'),
      db.raw('COALESCE(SUM(oi.quantity) FILTER (WHERE o.status <> \'cancelled\'), 0) AS units'),
      db.raw('COUNT(DISTINCT o."orderID") FILTER (WHERE o.status = \'cancelled\') AS cancelled')
    ),
    getSellerBalances(db, sellerId, { from, to }),
  ]);
  const gross = Number(sales.gross);
  const refunds = Number(sales.refunds);
  const orders = Number(sales.orders);
  return {
    gross_sales: gross,
    refunds,
    net_sales: Math.round((gross - refunds) * 100) / 100,
    orders,
    units: Number(sales.units),
    cancelled_orders: Number(sales.cancelled),
    average_order_value: orders ? Math.round((gross / orders) * 100) / 100 : 0,
    // From the ledger (by posting date), only for paid orders.
    commission: ledger.commission_charged,
    net_earnings: ledger.net_earnings,
  };
}

const change = (current, previous) => (previous ? Math.round(((current - previous) / previous) * 1000) / 10 : null);

async function getAnalytics(req, res) {
  try {
    const sellerId = req.seller.sellerID;
    const range = resolveRange(req.query);
    const granularity = GRANULARITY[req.query.granularity] || (range.days > 90 ? 'week' : 'day');

    const [totals, series, statuses, products, previous] = await Promise.all([
      totalsFor(sellerId, range.from, range.to),
      lines(sellerId, range.from, range.to)
        .whereRaw('o.status <> \'cancelled\'')
        .groupByRaw(`date_trunc('${granularity}', o."createdOn")`)
        .orderByRaw(`date_trunc('${granularity}', o."createdOn")`)
        .select(
          db.raw(`to_char(date_trunc('${granularity}', o."createdOn"), 'YYYY-MM-DD') AS bucket`),
          db.raw('SUM(oi."totalPrice") AS gross'),
          db.raw(`SUM(${REFUNDED}) AS refunds`),
          db.raw('COUNT(DISTINCT o."orderID") AS orders')
        ),
      lines(sellerId, range.from, range.to)
        .groupBy('o.status')
        .select('o.status', db.raw('COUNT(DISTINCT o."orderID") AS n')),
      lines(sellerId, range.from, range.to)
        .join('products as p', 'p.productID', 'oi.product_id')
        .whereRaw('o.status <> \'cancelled\'')
        .groupBy('p.productID', 'p.name', 'p.sku')
        .orderByRaw('SUM(oi."totalPrice") DESC')
        .limit(50)
        .select('p.productID', 'p.name', 'p.sku',
          db.raw('SUM(oi.quantity) AS units'),
          db.raw('SUM(oi."totalPrice") AS gross'),
          db.raw(`SUM(${REFUNDED}) AS refunds`),
          db.raw('COUNT(DISTINCT o."orderID") AS orders')),
      req.query.compare === '0' ? null : totalsFor(sellerId, range.prevFrom, range.prevTo),
    ]);

    return res.json({
      success: true,
      data: {
        range: { from: range.from, to: range.to, days: range.days, granularity },
        totals,
        comparison: previous ? {
          range: { from: range.prevFrom, to: range.prevTo },
          previous,
          change_percent: {
            gross_sales: change(totals.gross_sales, previous.gross_sales),
            net_sales: change(totals.net_sales, previous.net_sales),
            orders: change(totals.orders, previous.orders),
            units: change(totals.units, previous.units),
          },
          // Percentages are only shown when the previous period had data.
          sufficient_data: previous.orders > 0,
        } : null,
        series: series.map((r) => ({
          bucket: r.bucket, gross: Number(r.gross), refunds: Number(r.refunds), net: Number(r.gross) - Number(r.refunds), orders: Number(r.orders),
        })),
        status_breakdown: statuses.map((r) => ({ status: r.status, orders: Number(r.n) })),
        products: products.map((r) => ({
          id: r.productID, name: r.name, sku: r.sku, units: Number(r.units), orders: Number(r.orders),
          gross: Number(r.gross), refunds: Number(r.refunds), net: Number(r.gross) - Number(r.refunds),
        })),
        notes: [
          'Gross sales are the discounted product amounts of non-cancelled orders; delivery charges are excluded.',
          'Refunds include orders marked refunded and approved return refunds.',
          'Commission and net earnings count paid orders only, by the date they were posted.',
        ],
      },
    });
  } catch (err) {
    return sendServerError(res, 'getAnalytics', err);
  }
}

// Spreadsheet formula injection guard: a cell starting with = + - @ (or tab/CR) is prefixed with '.
const csvCell = (value) => {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

async function exportCsv(req, res) {
  try {
    const range = resolveRange(req.query);
    const rows = await lines(req.seller.sellerID, range.from, range.to)
      .leftJoin('products as p', 'p.productID', 'oi.product_id')
      .leftJoin(
        db('seller_ledger_entries')
          .select('order_item_id')
          .select(db.raw('COALESCE(-SUM(amount) FILTER (WHERE "entryType" IN (\'sale_commission\', \'commission_reversal\')), 0) AS commission'))
          .select(db.raw('MAX("commissionRateBps") FILTER (WHERE "entryType" = \'sale_commission\') AS rate'))
          .select(db.raw('SUM(amount) FILTER (WHERE "entryType" IN (\'sale_earnings_credit\', \'sale_commission\', \'commission_reversal\', \'refund_adjustment\')) AS net'))
          .groupBy('order_item_id')
          .as('lg'),
        'lg.order_item_id', 'oi.orderItemID'
      )
      .select(
        'o.orderCode', 'o.createdOn', 'o.status as orderStatus', 'o.paymentStatus', 'p.name as productName', 'p.sku',
        'oi.quantity', 'oi.unitPrice', 'oi.totalPrice', 'oi.fulfillmentStatus',
        db.raw(`${REFUNDED} AS refunded`), 'lg.commission', 'lg.rate', 'lg.net'
      )
      .orderBy('o.createdOn', 'desc')
      .limit(10000);

    const header = ['Order', 'Date', 'Product', 'SKU', 'Quantity', 'Unit price', 'Line total', 'Order status', 'Payment status',
      'Fulfillment', 'Refunded', 'Commission rate %', 'Commission', 'Net earnings (paid orders)'];
    const body = rows.map((r) => [
      r.orderCode, isoDay(new Date(r.createdOn)), r.productName, r.sku, r.quantity, r.unitPrice, r.totalPrice, r.orderStatus,
      r.paymentStatus, r.fulfillmentStatus, r.refunded, r.rate != null ? r.rate / 100 : '', r.commission ?? '', r.net ?? '',
    ].map(csvCell).join(','));

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="sales-${range.from}-to-${range.to}.csv"`);
    return res.status(StatusCodes.OK).send(`﻿${[header.join(','), ...body].join('\r\n')}\r\n`);
  } catch (err) {
    if (res.headersSent) return null;
    return sendServerError(res, 'exportCsv', err);
  }
}

module.exports = { getAnalytics, exportCsv, csvCell };
