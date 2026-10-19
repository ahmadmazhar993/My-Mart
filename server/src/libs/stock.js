/**
 * Single code path for every stock change (checkout, cancellation, seller
 * inventory edits). Callers pass a knex transaction. Product rows are locked
 * with FOR UPDATE so concurrent orders/edits serialize and stock can never go
 * negative; each change is recorded in stock_movements.
 */

class StockError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StockError';
  }
}

const parseVariants = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const variantKeyOf = (variant) => String(variant?.sku || variant?.name || variant?.label || '');

const findVariantIndex = (variants, { sku, name, label }) => variants.findIndex((variant) => (
  (sku && String(variant.sku || '') === String(sku))
  || (name && String(variant.name || '') === String(name))
  || (label && String(variant.label || '') === String(label))
));

const lockProduct = (trx, productID) => trx('products').where({ productID }).forUpdate().first();

/**
 * Applies `delta` (negative = remove stock) to a product that was already
 * loaded through lockProduct() in the same transaction.
 *
 * `variant` ({ sku, name, label }) targets a variant; its stock_quantity and
 * the product total are both adjusted, matching the existing checkout
 * behaviour where products.stockQuantity is always decremented.
 */
async function applyStockDelta(trx, product, {
  delta, reason, variant = null, note = null, orderId = null, actorId = null,
}) {
  if (!Number.isInteger(delta) || delta === 0) {
    throw new StockError('Stock change must be a non-zero whole number.');
  }

  const productBefore = Number(product.stockQuantity || 0);
  const productAfter = productBefore + delta;
  if (productAfter < 0) {
    throw new StockError(`Insufficient stock for ${product.name}`);
  }

  const update = { stockQuantity: productAfter, updatedOn: trx.fn.now() };
  let quantityBefore = productBefore;
  let quantityAfter = productAfter;
  let variantKey = null;

  if (variant && (variant.sku || variant.name || variant.label)) {
    const variants = parseVariants(product.variants);
    const index = findVariantIndex(variants, variant);
    if (index === -1) {
      throw new StockError(`Variant for ${product.name} is no longer available`);
    }
    const target = variants[index];
    variantKey = variantKeyOf(target);
    if (target.stock_quantity != null) {
      quantityBefore = Number(target.stock_quantity) || 0;
      quantityAfter = quantityBefore + delta;
      if (quantityAfter < 0) {
        throw new StockError(`Insufficient stock for ${product.name}`);
      }
      variants[index] = { ...target, stock_quantity: quantityAfter };
      update.variants = JSON.stringify(variants);
    }
  }

  await trx('products').where({ productID: product.productID }).update(update);
  await trx('stock_movements').insert({
    product_id: product.productID,
    variantKey,
    delta,
    quantityBefore,
    quantityAfter,
    reason,
    note,
    order_id: orderId,
    actor_user_id: actorId,
  });

  return {
    ...product,
    stockQuantity: productAfter,
    variants: update.variants ?? product.variants,
    updatedOn: new Date(),
  };
}

module.exports = {
  StockError,
  parseVariants,
  variantKeyOf,
  findVariantIndex,
  lockProduct,
  applyStockDelta,
};
