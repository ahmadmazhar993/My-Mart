exports.up = function createPaymentsTable(knex) {
  return knex.schema
    .createTable('payments', (table) => {
      table.uuid('paymentID').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('order_id').unsigned().notNullable();
      table.string('paymentMethod', 50).notNullable();
      table.decimal('amount', 12, 2).notNullable();
      table.enum('status', ['pending', 'completed', 'failed', 'refunded']).defaultTo('pending');
      table.string('transactionID').nullable().unique();
      table.json('metadata').nullable();
      table.timestamp('processedOn').nullable();
      table.timestamp('createdOn').defaultTo(knex.fn.now());
      table.timestamp('updatedOn').defaultTo(knex.fn.now());
      table.foreign('order_id').references('orderID').inTable('orders').onDelete('CASCADE');
    });
};

exports.down = function dropPaymentsTable(knex) {
  return knex.schema.dropTableIfExists('payments');
};
