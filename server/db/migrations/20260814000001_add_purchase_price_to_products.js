exports.up = function addPurchasePrice(knex) {
  return knex.schema.alterTable('products', (table) => {
    table.decimal('purchasePrice', 12, 2).nullable();
  });
};

exports.down = function dropPurchasePrice(knex) {
  return knex.schema.alterTable('products', (table) => {
    table.dropColumn('purchasePrice');
  });
};
