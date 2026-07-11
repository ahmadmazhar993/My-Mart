exports.up = function createCategoriesTable(knex) {
  return knex.schema
    .createTable('categories', (table) => {
      table.uuid('categoryID').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('name', 255).notNullable().unique();
      table.text('description');
      table.string('slug', 255).notNullable().unique();
      table.uuid('parentId').nullable();
      table.string('imageUrl').nullable();
      table.integer('displayOrder').defaultTo(0);
      table.boolean('isActive').defaultTo(true);
      table.timestamp('createdOn').defaultTo(knex.fn.now());
      table.timestamp('updatedOn').defaultTo(knex.fn.now());
      table.foreign('parentId').references('categoryID').inTable('categories').onDelete('SET NULL');
    });
};

exports.down = function dropCategoriesTable(knex) {
  return knex.schema.dropTableIfExists('categories');
};
