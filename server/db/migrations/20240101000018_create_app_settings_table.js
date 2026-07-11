exports.up = function createAppSettingsTable(knex) {
    return knex.schema.createTable('appSettings', (table) => {
        table.uuid('appSettingID').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));

        table.string('name').notNullable();
        table.string('type').notNullable();
        table.text('value').notNullable();

        table.timestamp('createdOn').defaultTo(knex.fn.now());
        table.timestamp('updatedOn').defaultTo(knex.fn.now());

        table.uuid('createdBy').notNullable().references('userID').inTable('user');
        table.uuid('updatedBy').notNullable().references('userID').inTable('user');

        table.unique(['name']);
    });
};

exports.down = function dropAppSettingsTable(knex) {
    return knex.schema.dropTable('appSettings');
};
