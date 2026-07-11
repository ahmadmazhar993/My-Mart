exports.up = function createOrderItemsTable(knex) {
  return knex.schema
    .createTable('order_items', (table) => {
      table.uuid('orderItemID').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('order_id').unsigned().notNullable();
      table.uuid('product_id').unsigned().notNullable();
      table.uuid('seller_id').unsigned().notNullable();
      table.integer('quantity').notNullable();
      table.decimal('unitPrice', 12, 2).notNullable();
      table.decimal('totalPrice', 12, 2).notNullable();
      table.timestamp('createdOn').defaultTo(knex.fn.now());
      table.timestamp('updatedOn').defaultTo(knex.fn.now());
      table.foreign('order_id').references('orderID').inTable('orders').onDelete('CASCADE');
      table.foreign('product_id').references('productID').inTable('products').onDelete('CASCADE');
      table.foreign('seller_id').references('sellerID').inTable('sellers').onDelete('CASCADE');
    });
};

exports.down = function dropOrderItemsTable(knex) {
  return knex.schema.dropTableIfExists('order_items');
};
