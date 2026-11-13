exports.up = function createWishlistItemsTable(knex) {
  return knex.schema.createTable('wishlist_items', (table) => {
    table.uuid('wishlistItemID').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable();
    table.uuid('product_id').notNullable();
    table.timestamp('createdOn').defaultTo(knex.fn.now());
    table.foreign('user_id').references('userID').inTable('user').onDelete('CASCADE');
    table.foreign('product_id').references('productID').inTable('products').onDelete('CASCADE');
    // A product can be saved only once per user.
    table.unique(['user_id', 'product_id']);
    table.index('user_id');
  });
};

exports.down = function dropWishlistItemsTable(knex) {
  return knex.schema.dropTableIfExists('wishlist_items');
};
