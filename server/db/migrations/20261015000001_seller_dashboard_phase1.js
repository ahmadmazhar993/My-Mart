/**
 * Seller dashboard — phase 1.
 *  - seller application / review fields
 *  - product approval workflow (existing products are backfilled as approved)
 *  - stock movement history
 *  - seller-side fulfillment status on order items (+ history)
 *  - non-negative stock guard (NOT VALID so legacy rows are not rewritten)
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('sellers', (table) => {
    table.string('contactPhone', 40).nullable();
    table.text('businessAddress').nullable();
    table.text('rejectionReason').nullable();
    table.text('suspendedReason').nullable();
    table.uuid('reviewedBy').nullable();
    table.timestamp('reviewedOn').nullable();
  });
  await knex.schema.alterTable('sellers', (table) => {
    table.unique('user_id', 'sellers_user_id_unique');
  });

  await knex.schema.alterTable('products', (table) => {
    table.string('approvalStatus', 20).notNullable().defaultTo('approved');
    table.text('rejectionReason').nullable();
    table.timestamp('submittedOn').nullable();
    table.timestamp('archivedOn').nullable();
  });
  await knex.raw(`ALTER TABLE products ADD CONSTRAINT products_approval_status_check
    CHECK ("approvalStatus" IN ('draft','pending_review','approved','rejected'))`);
  await knex.raw(`ALTER TABLE products ADD CONSTRAINT products_stock_non_negative
    CHECK ("stockQuantity" >= 0) NOT VALID`);
  await knex.raw('CREATE INDEX products_seller_idx ON products (seller_id)');
  await knex.raw('CREATE INDEX products_approval_idx ON products ("approvalStatus")');

  await knex.schema.createTable('stock_movements', (table) => {
    table.uuid('stockMovementID').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('product_id').notNullable().references('productID').inTable('products').onDelete('CASCADE');
    table.string('variantKey', 255).nullable();
    table.integer('delta').notNullable();
    table.integer('quantityBefore').notNullable();
    table.integer('quantityAfter').notNullable();
    table.string('reason', 40).notNullable();
    table.text('note').nullable();
    table.uuid('order_id').nullable();
    table.uuid('actor_user_id').nullable();
    table.timestamp('createdOn').notNullable().defaultTo(knex.fn.now());
    table.index(['product_id', 'createdOn']);
  });

  await knex.schema.alterTable('order_items', (table) => {
    table.string('fulfillmentStatus', 20).notNullable().defaultTo('pending');
  });
  await knex.raw(`ALTER TABLE order_items ADD CONSTRAINT order_items_fulfillment_check
    CHECK ("fulfillmentStatus" IN ('pending','processing','ready_to_ship','shipped'))`);
  await knex.raw('CREATE INDEX order_items_seller_idx ON order_items (seller_id)');

  await knex.schema.createTable('order_item_status_history', (table) => {
    table.uuid('historyID').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('order_item_id').notNullable().references('orderItemID').inTable('order_items').onDelete('CASCADE');
    table.string('fromStatus', 20).nullable();
    table.string('toStatus', 20).notNullable();
    table.uuid('actor_user_id').nullable();
    table.timestamp('createdOn').notNullable().defaultTo(knex.fn.now());
    table.index(['order_item_id', 'createdOn']);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('order_item_status_history');
  await knex.raw('DROP INDEX IF EXISTS order_items_seller_idx');
  await knex.raw('ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_fulfillment_check');
  await knex.schema.alterTable('order_items', (table) => {
    table.dropColumn('fulfillmentStatus');
  });
  await knex.schema.dropTableIfExists('stock_movements');
  await knex.raw('DROP INDEX IF EXISTS products_approval_idx');
  await knex.raw('DROP INDEX IF EXISTS products_seller_idx');
  await knex.raw('ALTER TABLE products DROP CONSTRAINT IF EXISTS products_stock_non_negative');
  await knex.raw('ALTER TABLE products DROP CONSTRAINT IF EXISTS products_approval_status_check');
  await knex.schema.alterTable('products', (table) => {
    table.dropColumns('approvalStatus', 'rejectionReason', 'submittedOn', 'archivedOn');
  });
  await knex.schema.alterTable('sellers', (table) => {
    table.dropUnique('user_id', 'sellers_user_id_unique');
  });
  await knex.schema.alterTable('sellers', (table) => {
    table.dropColumns('contactPhone', 'businessAddress', 'rejectionReason', 'suspendedReason', 'reviewedBy', 'reviewedOn');
  });
};
