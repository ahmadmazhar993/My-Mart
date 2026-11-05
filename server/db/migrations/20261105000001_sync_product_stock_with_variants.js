// One-time data fix: for products whose variants all track stock, set the
// product's stockQuantity to the sum of its variants' stock.
// Products with any variant missing a stock number are left untouched.
exports.up = async function syncProductStockWithVariants(knex) {
  const products = await knex('products')
    .whereNotNull('variants')
    .select('productID', 'variants', 'stockQuantity');

  for (const product of products) {
    let variants = product.variants;
    if (typeof variants === 'string') {
      try {
        variants = JSON.parse(variants);
      } catch {
        continue;
      }
    }
    if (!Array.isArray(variants) || variants.length === 0) continue;
    if (!variants.every((variant) => variant && variant.stock_quantity != null
      && !Number.isNaN(Number(variant.stock_quantity)))) continue;

    const total = variants.reduce((sum, variant) => sum + Number(variant.stock_quantity), 0);
    if (total !== Number(product.stockQuantity)) {
      // eslint-disable-next-line no-await-in-loop
      await knex('products').where({ productID: product.productID }).update({ stockQuantity: total });
    }
  }
};

// Data-only migration; the previous values are not recoverable.
exports.down = async function noop() {};
