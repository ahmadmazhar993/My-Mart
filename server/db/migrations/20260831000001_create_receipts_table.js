exports.up = async function(knex) {
  // Create a global invoice sequence and receipts table
  await knex.raw("CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;");

  await knex.schema.createTable('receipts', (table) => {
    table.increments('receiptID').primary();
    table.uuid('order_id').unsigned().unique().notNullable()
      .references('orderID').inTable('orders').onDelete('CASCADE');
    table.string('invoice_number').notNullable().unique()
      .defaultTo(knex.raw("concat('AHM-', to_char(now(),'YYYY'), '-', lpad(nextval('invoice_seq')::text, 6, '0'))"));
    table.timestamp('created_on').defaultTo(knex.fn.now());
    table.string('cashier_name');
    table.jsonb('data');
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('receipts');
  await knex.raw('DROP SEQUENCE IF EXISTS invoice_seq;');
};
