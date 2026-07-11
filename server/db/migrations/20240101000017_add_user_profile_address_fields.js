exports.up = function addUserProfileAddressFields(knex) {
  return knex.schema.alterTable('user', (table) => {
    table.string('address').nullable();
    table.string('city').nullable();
    table.string('postalCode').nullable();
  });
};

exports.down = function dropUserProfileAddressFields(knex) {
  return knex.schema.alterTable('user', (table) => {
    table.dropColumn('address');
    table.dropColumn('city');
    table.dropColumn('postalCode');
  });
};
