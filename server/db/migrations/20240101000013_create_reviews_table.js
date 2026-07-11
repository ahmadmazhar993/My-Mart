exports.up = function createReviewsTable(knex) {
  return knex.schema
    .createTable('reviews', (table) => {
      table.uuid('reviewID').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('product_id').unsigned().notNullable();
      table.uuid('user_id').unsigned().notNullable();
      table.uuid('order_id').unsigned().notNullable();
      table.integer('rating').notNullable();
      table.text('comment');
      table.json('images').nullable();
      table.integer('helpfulCount').defaultTo(0);
      table.boolean('verifiedPurchase').defaultTo(false);
      table.timestamp('createdOn').defaultTo(knex.fn.now());
      table.timestamp('updatedOn').defaultTo(knex.fn.now());
      table.foreign('product_id').references('productID').inTable('products').onDelete('CASCADE');
      table.foreign('user_id').references('userID').inTable('user').onDelete('CASCADE');
      table.foreign('order_id').references('orderID').inTable('orders').onDelete('CASCADE');
    });
};

exports.down = function dropReviewsTable(knex) {
  return knex.schema.dropTableIfExists('reviews');
};
