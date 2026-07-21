exports.up = function addVariantsToProducts(knex) {
  return knex.schema.table('products', (table) => {
    table.json('variants').nullable();
  });
};

exports.down = function removeVariantsFromProducts(knex) {
  return knex.schema.table('products', (table) => {
    table.dropColumn('variants');
  });
};
