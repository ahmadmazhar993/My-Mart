/**
 * Seller dashboard — phases 2 and 3.
 *  - commission settings with history (default 5%)
 *  - immutable seller ledger + payout requests
 *  - original (pre-discount) unit price snapshot on order items
 *  - returns / refunds workflow (+ messages)
 *  - marketplace settings (return window) and seller notification preferences
 */
exports.up = async (knex) => {
  // ---- commission configuration (append-only history; latest row is current) ----
  await knex.schema.createTable('commission_settings', (table) => {
    table.uuid('settingID').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.integer('rateBps').notNullable(); // basis points: 500 = 5.00%
    table.timestamp('effectiveFrom').notNullable().defaultTo(knex.fn.now());
    table.uuid('createdBy').nullable();
    table.text('note').nullable();
    table.timestamp('createdOn').notNullable().defaultTo(knex.fn.now());
    table.index(['effectiveFrom']);
  });
  await knex.raw('ALTER TABLE commission_settings ADD CONSTRAINT commission_rate_range CHECK ("rateBps" BETWEEN 1 AND 5000)');
  // The default applies from the moment the system is first configured.
  await knex('commission_settings').insert({ rateBps: 500, note: 'Default commission (5%)' });

  await knex.schema.createTable('marketplace_settings', (table) => {
    table.string('key', 60).primary();
    table.string('value', 255).notNullable();
    table.uuid('updatedBy').nullable();
    table.timestamp('updatedOn').notNullable().defaultTo(knex.fn.now());
  });
  await knex('marketplace_settings').insert({ key: 'return_window_days', value: '7' });

  // ---- order item snapshot of the list price before any discount ----
  await knex.schema.alterTable('order_items', (table) => {
    table.decimal('originalUnitPrice', 12, 2).nullable();
  });
  // Legacy rows: the pre-discount price was never stored, so the paid price is the best known value.
  await knex.raw('UPDATE order_items SET "originalUnitPrice" = "unitPrice" WHERE "originalUnitPrice" IS NULL');

  // ---- payouts ----
  await knex.schema.createTable('payout_requests', (table) => {
    table.uuid('payoutID').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('seller_id').notNullable().references('sellerID').inTable('sellers').onDelete('RESTRICT');
    table.decimal('amount', 12, 2).notNullable();
    table.string('currency', 3).notNullable().defaultTo('PKR');
    table.string('status', 20).notNullable().defaultTo('requested');
    table.string('idempotencyKey', 100).notNullable();
    table.text('sellerNote').nullable();
    table.string('reference', 120).nullable(); // e.g. bank transfer reference entered by the admin
    table.text('adminNote').nullable();
    table.uuid('requestedBy').nullable();
    table.uuid('processedBy').nullable();
    table.timestamp('requestedOn').notNullable().defaultTo(knex.fn.now());
    table.timestamp('processedOn').nullable();
    table.unique(['seller_id', 'idempotencyKey']);
    table.index(['seller_id', 'requestedOn']);
  });
  await knex.raw('ALTER TABLE payout_requests ADD CONSTRAINT payout_amount_positive CHECK (amount > 0)');
  await knex.raw(`ALTER TABLE payout_requests ADD CONSTRAINT payout_status_check
    CHECK (status IN ('requested','completed','rejected','failed'))`);

  // ---- returns ----
  await knex.schema.createTable('return_requests', (table) => {
    table.uuid('returnID').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('order_id').notNullable().references('orderID').inTable('orders').onDelete('RESTRICT');
    table.uuid('order_item_id').notNullable().references('orderItemID').inTable('order_items').onDelete('RESTRICT');
    table.uuid('seller_id').notNullable().references('sellerID').inTable('sellers').onDelete('RESTRICT');
    table.uuid('user_id').notNullable().references('userID').inTable('user').onDelete('RESTRICT');
    table.integer('quantity').notNullable();
    table.string('reason', 40).notNullable();
    table.text('details').nullable();
    table.json('evidence').nullable(); // uploaded image paths
    table.string('status', 20).notNullable().defaultTo('requested');
    table.text('decisionNote').nullable();
    table.uuid('decidedBy').nullable();
    table.timestamp('decidedOn').nullable();
    table.text('inspectionNote').nullable();
    table.uuid('receivedBy').nullable();
    table.timestamp('receivedOn').nullable();
    table.decimal('refundAmount', 12, 2).nullable();
    table.uuid('refundedBy').nullable();
    table.timestamp('refundedOn').nullable();
    table.timestamp('createdOn').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedOn').notNullable().defaultTo(knex.fn.now());
    table.index(['seller_id', 'status']);
    table.index(['user_id']);
    table.index(['order_item_id']);
  });
  await knex.raw('ALTER TABLE return_requests ADD CONSTRAINT return_qty_positive CHECK (quantity > 0)');
  await knex.raw(`ALTER TABLE return_requests ADD CONSTRAINT return_status_check
    CHECK (status IN ('requested','approved','rejected','received','refunded','cancelled'))`);

  await knex.schema.createTable('return_messages', (table) => {
    table.uuid('messageID').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('return_id').notNullable().references('returnID').inTable('return_requests').onDelete('CASCADE');
    table.uuid('author_user_id').notNullable();
    table.string('authorRole', 10).notNullable();
    table.text('body').notNullable();
    table.timestamp('createdOn').notNullable().defaultTo(knex.fn.now());
    table.index(['return_id', 'createdOn']);
  });
  await knex.raw(`ALTER TABLE return_messages ADD CONSTRAINT return_message_role_check
    CHECK ("authorRole" IN ('customer','seller','admin'))`);

  // ---- ledger (immutable) ----
  await knex.schema.createTable('seller_ledger_entries', (table) => {
    table.uuid('ledgerEntryID').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('seller_id').notNullable().references('sellerID').inTable('sellers').onDelete('RESTRICT');
    table.uuid('order_id').nullable().references('orderID').inTable('orders').onDelete('RESTRICT');
    table.uuid('order_item_id').nullable().references('orderItemID').inTable('order_items').onDelete('RESTRICT');
    table.uuid('payout_id').nullable().references('payoutID').inTable('payout_requests').onDelete('RESTRICT');
    table.uuid('return_id').nullable().references('returnID').inTable('return_requests').onDelete('RESTRICT');
    table.string('entryType', 30).notNullable();
    table.string('reason', 40).notNullable();
    table.integer('quantity').notNullable().defaultTo(0);
    table.decimal('commissionBase', 12, 2).nullable();
    table.integer('commissionRateBps').nullable();
    table.decimal('amount', 12, 2).notNullable(); // signed effect on the seller's balance
    table.string('currency', 3).notNullable().defaultTo('PKR');
    table.string('idempotencyKey', 160).notNullable().unique();
    table.jsonb('metadata').nullable();
    table.uuid('createdBy').nullable();
    table.timestamp('createdOn').notNullable().defaultTo(knex.fn.now());
    table.index(['seller_id', 'createdOn']);
    table.index(['order_id']);
    table.index(['order_item_id']);
  });
  await knex.raw(`ALTER TABLE seller_ledger_entries ADD CONSTRAINT ledger_type_sign_check CHECK (
    ("entryType" = 'sale_earnings_credit' AND amount > 0)
    OR ("entryType" = 'sale_commission' AND amount <= 0)
    OR ("entryType" = 'commission_reversal' AND amount >= 0)
    OR ("entryType" = 'refund_adjustment' AND amount < 0)
    OR ("entryType" = 'payout' AND amount < 0)
    OR ("entryType" = 'payout_reversal' AND amount > 0))`);
  // Financial history is never edited or erased; corrections are new, opposite entries.
  await knex.raw(`CREATE FUNCTION seller_ledger_immutable() RETURNS trigger AS $$
    BEGIN RAISE EXCEPTION 'seller_ledger_entries is append-only'; END;
    $$ LANGUAGE plpgsql`);
  await knex.raw(`CREATE TRIGGER seller_ledger_no_change BEFORE UPDATE OR DELETE ON seller_ledger_entries
    FOR EACH ROW EXECUTE FUNCTION seller_ledger_immutable()`);
  await knex.raw(`CREATE TRIGGER seller_ledger_no_truncate BEFORE TRUNCATE ON seller_ledger_entries
    FOR EACH STATEMENT EXECUTE FUNCTION seller_ledger_immutable()`);

  // ---- seller notification preferences ----
  await knex.schema.alterTable('sellers', (table) => {
    table.boolean('notifyNewOrder').notNullable().defaultTo(true);
    table.boolean('notifyReturns').notNullable().defaultTo(true);
    table.boolean('notifyPayouts').notNullable().defaultTo(true);
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('sellers', (table) => {
    table.dropColumns('notifyNewOrder', 'notifyReturns', 'notifyPayouts');
  });
  await knex.raw('DROP TRIGGER IF EXISTS seller_ledger_no_truncate ON seller_ledger_entries');
  await knex.raw('DROP TRIGGER IF EXISTS seller_ledger_no_change ON seller_ledger_entries');
  await knex.schema.dropTableIfExists('seller_ledger_entries');
  await knex.raw('DROP FUNCTION IF EXISTS seller_ledger_immutable()');
  await knex.schema.dropTableIfExists('return_messages');
  await knex.schema.dropTableIfExists('return_requests');
  await knex.schema.dropTableIfExists('payout_requests');
  await knex.schema.alterTable('order_items', (table) => {
    table.dropColumn('originalUnitPrice');
  });
  await knex.schema.dropTableIfExists('marketplace_settings');
  await knex.schema.dropTableIfExists('commission_settings');
};
