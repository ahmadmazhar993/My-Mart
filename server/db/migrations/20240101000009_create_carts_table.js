exports.up = function createCartsTable(knex) {
  return knex.schema
    .createTable('carts', (table) => {
      table.uuid('cartID').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('user_id').unsigned().notNullable();
      table.timestamp('createdOn').defaultTo(knex.fn.now());
      table.timestamp('updatedOn').defaultTo(knex.fn.now());
      table.foreign('user_id').references('userID').inTable('user').onDelete('CASCADE');
      table.unique('user_id');
    });
};

exports.down = function dropCartsTable(knex) {
  return knex.schema.dropTableIfExists('carts');
};
  