exports.up = function addVariantSnapshotToOrderItems(knex) {
  return knex.schema.table('order_items', (table) => {
    table.string('variant_name', 255).nullable();
    table.string('variant_label', 255).nullable();
    table.string('variant_sku', 100).nullable();
  });
};

exports.down = function removeVariantSnapshotFromOrderItems(knex) {
  return knex.schema.table('order_items', (table) => {
    table.dropColumn('variant_name');
    table.dropColumn('variant_label');
    table.dropColumn('variant_sku');
  });
};
