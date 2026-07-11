exports.up = function createUserTable(knex) {
  return knex.schema.createTable('user', (table) => {
    table.uuid('userID').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));

    table.string('firstName').notNullable();
    table.string('lastName').notNullable();
    table.string('email').notNullable();

    table.uuid('accessTemplateID').notNullable().references('accessTemplateID').inTable('accessTemplate');
    table.string('password').nullable();

    table.string('status').notNullable().defaultTo('Active');
    table.bool('isActive').notNullable().defaultTo(false);

    table.string('phoneNumber').nullable();
    table.string('profilePicture').nullable();

    table.bool('isDeleted').notNullable().defaultTo(false);
    table.uuid('deletedBy').nullable().references('userID').inTable('user');

    table.timestamp('createdOn').defaultTo(knex.fn.now());
    table.uuid('createdBy').nullable().references('userID').inTable('user');

    table.timestamp('updatedOn').defaultTo(knex.fn.now());

    table.bool('isEnabled').notNullable().defaultTo(false);

    table.index(['email'], 'idx_user_email', {
      storageEngineIndexType: 'hash',
      predicate: knex.whereNotNull('email'),
    });

    table.index(['firstName'], 'idx_user_first_name', {
      storageEngineIndexType: 'hash',
      predicate: knex.whereNotNull('firstName'),
    });

    table.index(['lastName'], 'idx_user_last_name', {
      storageEngineIndexType: 'hash',
      predicate: knex.whereNotNull('lastName'),
    });

    table.index(['accessTemplateID'], 'idx_user_access_template_id', {
      storageEngineIndexType: 'hash',
      predicate: knex.whereNotNull('accessTemplateID'),
    });

    table.index(['isActive'], 'idx_user_is_active', {
      storageEngineIndexType: 'hash',
      predicate: knex.whereNotNull('isActive'),
    });

    table.index(['isDeleted'], 'idx_user_is_deleted', {
      storageEngineIndexType: 'hash',
      predicate: knex.whereNotNull('isDeleted'),
    });

    table.index(['isEnabled'], 'idx_user_is_enabled', {
      storageEngineIndexType: 'hash',
      predicate: knex.whereNotNull('isEnabled'),
    });
  });
};

exports.down = function dropUserTable(knex) {
  return knex.schema.dropTable('user');
};
