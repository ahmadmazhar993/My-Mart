exports.up = function createCartItemsTable(knex) {
  return knex.schema.createTable('cart_items', (table) => {
    table.uuid('cartItemID').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('cart_id').unsigned().notNullable();
    table.uuid('product_id').unsigned().notNullable();
    table.integer('quantity').defaultTo(1);
    table.decimal('price', 12, 2).notNullable();
    table.timestamp('createdOn').defaultTo(knex.fn.now());
    table.timestamp('updatedOn').defaultTo(knex.fn.now());
    table.foreign('cart_id').references('cartID').inTable('carts').onDelete('CASCADE');
    table.foreign('product_id').references('productID').inTable('products').onDelete('CASCADE');
  });
};

exports.down = function dropCartItemsTable(knex) {
  return knex.schema.dropTableIfExists('cart_items');
};