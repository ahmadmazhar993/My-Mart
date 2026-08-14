exports.up = function addPurchasePriceToOrderItems(knex) {
  return knex.schema.alterTable('order_items', (table) => {
    table.decimal('purchasePrice', 12, 2).nullable();
  });
};

exports.down = function removePurchasePriceFromOrderItems(knex) {
  return knex.schema.alterTable('order_items', (table) => {
    table.dropColumn('purchasePrice');
  });
};
