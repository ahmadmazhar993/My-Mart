const slugify = (value) => String(value || '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

exports.up = async (knex) => {
  await knex.schema.alterTable('products', (table) => {
    table.string('slug', 255);
  });

  const rows = await knex('products')
    .select('productID', 'name')
    .orderBy('createdOn', 'asc');

  const used = new Set();

  // eslint-disable-next-line no-restricted-syntax
  for (const row of rows) {
    const base = slugify(row.name) || 'product';
    let slug = base;
    let counter = 2;
    while (used.has(slug)) {
      slug = `${base}-${counter}`;
      counter += 1;
    }
    used.add(slug);

    // eslint-disable-next-line no-await-in-loop
    await knex('products').where({ productID: row.productID }).update({ slug });
  }

  await knex.schema.alterTable('products', (table) => {
    table.unique('slug');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('products', (table) => {
    table.dropUnique('slug');
    table.dropColumn('slug');
  });
};