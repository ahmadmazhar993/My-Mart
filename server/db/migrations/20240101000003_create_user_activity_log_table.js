exports.up = function createUserActivityLogTable(knex) {
    return knex.schema.createTable('userActivityLog', (table) => {
        table.uuid('userActivityLogID').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));

        table.string('targetEntity').notNullable();
        table.string('targetID').notNullable();
        table.string('action').notNullable();
        table.text('description').notNullable();
        table.json('data').nullable();

        table.uuid('userID').notNullable();

        table.timestamp('userActivityLogTime').defaultTo(knex.fn.now());

        table.index(['targetEntity'], 'idx_user_activity_log_target_entity', {
            storageEngineIndexType: 'hash',
        });

        table.index(['targetEntity'], 'idx_user_activity_log_action', {
            storageEngineIndexType: 'hash',
            predicate: knex.whereNotNull('action'),
        });

        table.index(['userID'], 'idx_user_activity_log_user_id', {
            storageEngineIndexType: 'hash',
            predicate: knex.whereNotNull('userID'),
        });

        table.index(['userActivityLogTime'], 'idx_user_activity_log_user_activity_log_time', {
            storageEngineIndexType: 'btree',
            predicate: knex.whereNotNull('userActivityLogTime'),
        });
    });
};

exports.down = function dropUserActivityLogTable(knex) {
    return knex.schema.dropTable('userActivityLog');
};
