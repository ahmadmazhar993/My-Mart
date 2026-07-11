exports.up = function createSellersTable(knex) {
  return knex.schema
    .createTable('sellers', (table) => {
      table.uuid('sellerID').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('user_id').unsigned().notNullable();
      table.string('shopName', 255).notNullable();
      table.text('shopDescription');
      table.string('shopLogoUrl').nullable();
      table.decimal('rating', 3, 2).defaultTo(0);
      table.integer('totalSales').defaultTo(0);
      table.enum('status', ['pending', 'approved', 'rejected', 'suspended']).defaultTo('pending');
      table.timestamp('approvedOn').nullable();
      table.timestamp('createdOn').defaultTo(knex.fn.now());
      table.timestamp('updatedOn').defaultTo(knex.fn.now());
      table.foreign('user_id').references('userID').inTable('user').onDelete('CASCADE');
    });
};

exports.down = function dropSellersTable(knex) {
  return knex.schema.dropTableIfExists('sellers');
};
