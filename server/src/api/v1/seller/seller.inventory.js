const { StatusCodes } = require('http-status-codes');
const db = require('../../../db');
const {
  LOW_STOCK_THRESHOLD, isUuid, escapeLike, parsePagination, buildPagination,
  sendError, sendServerError, audit, toInt,
} = require('./seller.shared');
const realtime = require('../../../libs/realtime');
const {
  StockError, parseVariants, variantKeyOf, findVariantIndex, lockProduct, applyStockDelta,
} = require('../../../libs/stock');

const MAX_STOCK = 1000000;

const stockState = (quantity) => {
  if (quantity <= 0) return 'out';
  if (quantity <= LOW_STOCK_THRESHOLD) return 'low';
  return 'in';
};

const mapInventoryRow = (row) => {
  const variants = parseVariants(row.variants)
    .filter((variant) => variant.stock_quantity != null)
    .map((variant) => ({
      key: variantKeyOf(variant),
      name: variant.name,
      sku: variant.sku || null,
      stock_quantity: Number(variant.stock_quantity) || 0,
      state: stockState(Number(variant.stock_quantity) || 0),
    }));
  const quantity = Number(row.stockQuantity || 0);
  return {
    id: row.productID,
    name: row.name,
    sku: row.sku,
    image_url: row.imageUrl,
    stock_quantity: quantity,
    state: stockState(quantity),
    approval_status: row.approvalStatus,
    is_active: row.isActive,
    variants,
    updated_at: row.updatedOn,
  };
};

async function listInventory(req, res) {
  try {
    const pg = parsePagination(req.query);
    const search = String(req.query.search || '').trim();
    const { stock } = req.query;

    const base = db('products')
      .where('seller_id', req.seller.sellerID)
      .whereNull('archivedOn');

    if (stock === 'out') base.where('stockQuantity', '<=', 0);
    else if (stock === 'low') base.whereBetween('stockQuantity', [1, LOW_STOCK_THRESHOLD]);
    else if (stock === 'in') base.where('stockQuantity', '>', LOW_STOCK_THRESHOLD);

    if (search) {
      const pattern = `%${escapeLike(search)}%`;
      base.where((builder) => builder.whereRaw('name ILIKE ?', [pattern]).orWhereRaw('sku ILIKE ?', [pattern]));
    }

    const totalRow = await base.clone().count({ total: '*' }).first();
    const rows = await base.clone()
      .select('productID', 'name', 'sku', 'imageUrl', 'stockQuantity', 'variants', 'approvalStatus', 'isActive', 'updatedOn')
      .orderBy('stockQuantity', 'asc')
      .orderBy('name', 'asc')
      .limit(pg.limit)
      .offset(pg.offset);

    return res.json({
      success: true,
      data: rows.map(mapInventoryRow),
      pagination: buildPagination(pg, Number(totalRow.total)),
      meta: { lowStockThreshold: LOW_STOCK_THRESHOLD },
    });
  } catch (err) {
    return sendServerError(res, 'listInventory', err);
  }
}

/**
 * body: { mode: 'set' | 'adjust', quantity: int, variant_key?: string, note?: string }
 *  - set    : quantity is the new absolute stock (>= 0)
 *  - adjust : quantity is a signed change (e.g. +10 / -3)
 * The product row is locked, so a concurrent checkout and a seller edit are
 * applied one after the other and stock can never drop below zero.
 */
async function updateStock(req, res) {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return sendError(res, StatusCodes.NOT_FOUND, 'Product not found');

    const body = req.body || {};
    const mode = body.mode === 'adjust' ? 'adjust' : body.mode === 'set' ? 'set' : null;
    const quantity = toInt(body.quantity);
    const note = body.note == null ? null : String(body.note).trim().slice(0, 200) || null;
    if (!mode) return sendError(res, StatusCodes.BAD_REQUEST, 'Mode must be "set" or "adjust".');
    if (quantity == null || Math.abs(quantity) > MAX_STOCK) {
      return sendError(res, StatusCodes.BAD_REQUEST, 'Quantity must be a whole number.');
    }
    if (mode === 'set' && quantity < 0) {
      return sendError(res, StatusCodes.BAD_REQUEST, 'Stock cannot be negative.');
    }

    const result = await db.transaction(async (trx) => {
      const product = await lockProduct(trx, id);
      // Ownership is checked on the locked row; other sellers' products look nonexistent.
      if (!product || product.seller_id !== req.seller.sellerID || product.archivedOn) return null;

      let current = Number(product.stockQuantity || 0);
      let variant = null;
      if (body.variant_key) {
        const variants = parseVariants(product.variants);
        const index = findVariantIndex(variants, { sku: body.variant_key, name: body.variant_key });
        if (index === -1 || variants[index].stock_quantity == null) {
          throw new StockError('That variant does not track stock.');
        }
        current = Number(variants[index].stock_quantity) || 0;
        variant = { sku: variants[index].sku, name: variants[index].name, label: variants[index].label };
      }

      const delta = mode === 'set' ? quantity - current : quantity;
      if (current + delta < 0) throw new StockError('Stock cannot go below zero.');
      if (current + delta > MAX_STOCK) throw new StockError('Stock is too large.');
      if (delta === 0) return { product, delta: 0 };

      const updated = await applyStockDelta(trx, product, {
        delta, reason: 'seller_adjustment', variant, note, actorId: req.activeUser.userID,
      });
      return { product: updated, delta };
    });

    if (!result) return sendError(res, StatusCodes.NOT_FOUND, 'Product not found');

    if (result.delta !== 0) {
      await audit({
        entity: 'SellerInventory', targetID: id, action: 'StockUpdate', description: `Stock changed by ${result.delta} for "${result.product.name}"`, userID: req.activeUser.userID, data: { delta: result.delta, variant: body.variant_key || null },
      });
    }
    if (result.delta !== 0) realtime.emitSeller(req.seller.sellerID, 'inventory', { id, action: 'stock', admin: false });
    return res.json({ success: true, data: mapInventoryRow(result.product) });
  } catch (err) {
    if (err instanceof StockError) return sendError(res, StatusCodes.CONFLICT, err.message);
    return sendServerError(res, 'updateStock', err);
  }
}

async function listMovements(req, res) {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return sendError(res, StatusCodes.NOT_FOUND, 'Product not found');
    const product = await db('products').first('productID').where({ productID: id, seller_id: req.seller.sellerID });
    if (!product) return sendError(res, StatusCodes.NOT_FOUND, 'Product not found');

    const rows = await db('stock_movements')
      .where({ product_id: id })
      .orderBy('createdOn', 'desc')
      .limit(50);

    return res.json({
      success: true,
      data: rows.map((row) => ({
        id: row.stockMovementID,
        variant: row.variantKey,
        delta: row.delta,
        quantity_before: row.quantityBefore,
        quantity_after: row.quantityAfter,
        reason: row.reason,
        note: row.note,
        created_at: row.createdOn,
      })),
    });
  } catch (err) {
    return sendServerError(res, 'listMovements', err);
  }
}

module.exports = { listInventory, updateStock, listMovements };
