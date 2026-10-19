exports.up = function addBrand(knex) {
  return knex.schema.alterTable('products', (table) => {
    table.string('brand', 120).nullable();
    table.index('brand');
  });
};

exports.down = function dropBrand(knex) {
  return knex.schema.alterTable('products', (table) => {
    table.dropIndex('brand');
    table.dropColumn('brand');
  });
};
