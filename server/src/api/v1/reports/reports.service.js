const { StatusCodes } = require('http-status-codes');
const db = require('../../../db');

async function salesSummary(req, res) {
  try {
    // use raw YYYY-MM-DD strings to perform DATE(...) comparisons
    const startDateStr = req.query.start_date ? String(req.query.start_date) : null;
    const endDateStr = req.query.end_date ? String(req.query.end_date) : null;
    const groupBy = String(req.query.group_by || 'product'); // 'product' or 'date'

    const baseQuery = db('order_items')
      .leftJoin('orders', 'orders.orderID', 'order_items.order_id')
      .leftJoin('products', 'products.productID', 'order_items.product_id')
      .whereNotNull('orders.orderID');

    // If date strings are provided, compare only the DATE part so the end date is inclusive
    if (startDateStr && endDateStr) {
      baseQuery.andWhereRaw('DATE(orders."createdOn") BETWEEN ? AND ?', [startDateStr, endDateStr]);
    } else if (startDateStr) {
      baseQuery.andWhereRaw('DATE(orders."createdOn") >= ?', [startDateStr]);
    } else if (endDateStr) {
      baseQuery.andWhereRaw('DATE(orders."createdOn") <= ?', [endDateStr]);
    }

    if (groupBy === 'date') {
      const rows = await baseQuery
        .select(
          db.raw("DATE(orders.\"createdOn\") as date"),
          db.raw('SUM(order_items.quantity) as quantity_sold'),
          db.raw('SUM(order_items."unitPrice" * order_items.quantity) as revenue'),
          // cost: only count when there is a purchase price (order item or product fallback)
          db.raw('SUM(CASE WHEN COALESCE(order_items."purchasePrice", products."purchasePrice") IS NULL THEN 0 ELSE COALESCE(order_items."purchasePrice", products."purchasePrice") * order_items.quantity END) as cost'),
          // profit: per-item profit only when purchase price available, otherwise 0
          db.raw('SUM(CASE WHEN COALESCE(order_items."purchasePrice", products."purchasePrice") IS NULL THEN 0 ELSE (order_items."unitPrice" - COALESCE(order_items."purchasePrice", products."purchasePrice")) * order_items.quantity END) as profit')
        )
        .groupByRaw('DATE(orders."createdOn")')
        .orderBy('date', 'desc');

      const formatted = rows.map((r) => ({
        date: r.date,
        quantity_sold: Number(r.quantity_sold || 0),
        revenue: Number(r.revenue || 0),
        cost: Number(r.cost || 0),
        profit: Number(r.profit || 0),
      }));

      return res.status(StatusCodes.OK).json({ success: true, data: formatted });
    }

    if (groupBy === 'variant') {
      // Only include rows where a variant SKU exists — exclude product-level aggregates
      const variantQuery = baseQuery.clone().whereNotNull('order_items.variant_sku');

      const rows = await variantQuery
        .select(
          'order_items.variant_sku',
          'order_items.variant_label as variant_name',
          'order_items.product_id',
          'products.name as product_name',
          db.raw('SUM(order_items.quantity) as quantity_sold'),
          db.raw('SUM(order_items."unitPrice" * order_items.quantity) as revenue'),
          db.raw('SUM(CASE WHEN COALESCE(order_items."purchasePrice", products."purchasePrice") IS NULL THEN 0 ELSE COALESCE(order_items."purchasePrice", products."purchasePrice") * order_items.quantity END) as cost'),
          db.raw('SUM(CASE WHEN COALESCE(order_items."purchasePrice", products."purchasePrice") IS NULL THEN 0 ELSE (order_items."unitPrice" - COALESCE(order_items."purchasePrice", products."purchasePrice")) * order_items.quantity END) as profit')
        )
        .groupBy('order_items.variant_sku', 'order_items.variant_label', 'order_items.product_id', 'products.name')
        .orderBy('revenue', 'desc');

      const formatted = rows.map((r) => ({
        variant_sku: r.variant_sku,
        variant_name: r.variant_name,
        product_id: r.product_id,
        product_name: r.product_name,
        quantity_sold: Number(r.quantity_sold || 0),
        revenue: Number(r.revenue || 0),
        cost: Number(r.cost || 0),
        profit: Number(r.profit || 0),
      }));

      return res.status(StatusCodes.OK).json({ success: true, data: formatted });
    }

    // default: group by product
    const rows = await baseQuery
      .select(
        'order_items.product_id',
        'products.name as product_name',
        db.raw('SUM(order_items.quantity) as quantity_sold'),
        db.raw('SUM(order_items."unitPrice" * order_items.quantity) as revenue'),
        db.raw('SUM(CASE WHEN COALESCE(order_items."purchasePrice", products."purchasePrice") IS NULL THEN 0 ELSE COALESCE(order_items."purchasePrice", products."purchasePrice") * order_items.quantity END) as cost'),
        db.raw('SUM(CASE WHEN COALESCE(order_items."purchasePrice", products."purchasePrice") IS NULL THEN 0 ELSE (order_items."unitPrice" - COALESCE(order_items."purchasePrice", products."purchasePrice")) * order_items.quantity END) as profit')
      )
      .groupBy('order_items.product_id', 'products.name')
      .orderBy('revenue', 'desc');

    const formatted = rows.map((r) => ({
      product_id: r.product_id,
      product_name: r.product_name,
      quantity_sold: Number(r.quantity_sold || 0),
      revenue: Number(r.revenue || 0),
      cost: Number(r.cost || 0),
      profit: Number(r.profit || 0),
    }));

    return res.status(StatusCodes.OK).json({ success: true, data: formatted });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: err.message || 'Failed to compute sales summary' });
  }
}

module.exports = {
  salesSummary,
};
