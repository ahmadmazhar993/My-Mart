exports.up = function createAccessTemplateTable(knex) {
    return knex.schema.createTable('accessTemplate', (table) => {
        table.uuid('accessTemplateID').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
        table.string('name').notNullable();
        table.string('type').notNullable();
        table.string('description').nullable();

        table.unique(['name']);
    }).then(() => knex('accessTemplate').insert([
        { name: 'Admin', type: 'Admin', description: 'Full portal access' },
        { name: 'Customer', type: 'Customer', description: 'Customer access' },
        { name: 'Seller', type: 'Seller', description: 'Seller access' },
    ]).onConflict('name').ignore());
};

exports.down = function dropAccessTemplateTable(knex) {
    return knex.schema.dropTable('accessTemplate');
};
