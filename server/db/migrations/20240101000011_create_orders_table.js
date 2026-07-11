exports.up = function createOrdersTable(knex) {
  return knex.schema
    .createTable('orders', (table) => {
      table.uuid('orderID').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('user_id').unsigned().notNullable();
      table.decimal('totalPrice', 12, 2).notNullable();
      table.decimal('taxAmount', 12, 2).defaultTo(0);
      table.decimal('shippingCost', 12, 2).defaultTo(0);
      table.decimal('discountAmount', 12, 2).defaultTo(0);
      table.enum('status', ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']).defaultTo('pending');
      table.enum('paymentStatus', ['unpaid', 'paid', 'refunded']).defaultTo('unpaid');
      table.enum('paymentMethod', ['cod', 'online']).nullable();
      table.string('shippingAddress', 500);
      table.string('trackingNumber').nullable();
      table.timestamp('shippedOn').nullable();
      table.timestamp('deliveredOn').nullable();
      table.timestamp('createdOn').defaultTo(knex.fn.now());
      table.timestamp('updatedOn').defaultTo(knex.fn.now());
      table.foreign('user_id').references('userID').inTable('user').onDelete('CASCADE');
    });
};

exports.down = function dropOrdersTable(knex) {
  return knex.schema.dropTableIfExists('orders');
};
