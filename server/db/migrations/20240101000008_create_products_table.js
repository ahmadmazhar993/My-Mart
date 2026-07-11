exports.up = function createProductsTable(knex) {
  return knex.schema
    .createTable('products', (table) => {
      table.uuid('productID').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('name', 255).notNullable();
      table.text('description');
      table.decimal('price', 12, 2).notNullable();
      table.decimal('discountPrice', 12, 2).nullable();
      table.integer('discountPercentage').nullable();
      table.integer('stockQuantity').defaultTo(0);
      table.uuid('seller_id').unsigned().notNullable();
      table.uuid('category_id').unsigned().notNullable();
      table.string('sku', 100).unique().nullable();
      table.decimal('rating', 3, 2).defaultTo(0);
      table.integer('reviewCount').defaultTo(0);
      table.string('imageUrl').nullable();
      table.json('images').nullable();
      table.boolean('isActive').defaultTo(true);
      table.timestamp('createdOn').defaultTo(knex.fn.now());
      table.timestamp('updatedOn').defaultTo(knex.fn.now());
      table.foreign('seller_id').references('sellerID').inTable('sellers').onDelete('CASCADE');
      table.foreign('category_id').references('categoryID').inTable('categories').onDelete('CASCADE');
    });
};

exports.down = function dropProductsTable(knex) {
  return knex.schema.dropTableIfExists('products');
};
