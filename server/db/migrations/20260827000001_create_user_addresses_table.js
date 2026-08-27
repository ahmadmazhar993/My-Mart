exports.up = function createUserAddressesTable(knex) {
  return knex.schema.createTable('user_addresses', (table) => {
    table.uuid('addressID').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('userID').inTable('user').onDelete('CASCADE');
    table.string('label', 50).notNullable().defaultTo('Home');
    table.string('fullName', 150).notNullable();
    table.string('phone', 30).notNullable();
    table.string('address', 500).notNullable();
    table.string('city', 100).notNullable();
    table.string('postalCode', 20).nullable();
    table.timestamp('createdOn').defaultTo(knex.fn.now());
    table.timestamp('updatedOn').defaultTo(knex.fn.now());

    table.index(['user_id'], 'idx_user_addresses_user_id');
  });
};

exports.down = function dropUserAddressesTable(knex) {
  return knex.schema.dropTableIfExists('user_addresses');
};