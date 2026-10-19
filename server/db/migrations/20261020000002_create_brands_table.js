const slugify = (value) => String(value || '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

// Holds the logo/description/featured flag for each brand. products.brand stays a plain name;
// it is matched to this table case-insensitively, so a brand works with or without a row here.
exports.up = async (knex) => {
  await knex.schema.createTable('brands', (table) => {
    table.uuid('brandID').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 120).notNullable();
    table.string('slug', 160).notNullable();
    table.string('logoUrl', 500).nullable();
    table.text('description').nullable();
    table.boolean('isFeatured').notNullable().defaultTo(false);
    table.timestamp('createdOn').defaultTo(knex.fn.now());
    table.timestamp('updatedOn').defaultTo(knex.fn.now());
  });
  await knex.raw('CREATE UNIQUE INDEX brands_name_lower_unique ON brands (LOWER(name))');
  await knex.raw('CREATE UNIQUE INDEX brands_slug_unique ON brands (slug)');

  // Create a row for every brand already used by products.
  const rows = await knex('products')
    .whereNotNull('brand')
    .whereRaw("TRIM(brand) <> ''")
    .select('brand')
    .count({ count: '*' })
    .groupBy('brand');

  const seen = new Map();
  rows.forEach((row) => {
    const key = row.brand.toLowerCase();
    const count = Number(row.count) || 0;
    const current = seen.get(key);
    if (!current || count > current.count) seen.set(key, { name: row.brand, count });
  });

  const usedSlugs = new Set();
  const inserts = [...seen.values()].map(({ name }) => {
    const base = slugify(name) || 'brand';
    let slug = base;
    let n = 2;
    while (usedSlugs.has(slug)) { slug = `${base}-${n}`; n += 1; }
    usedSlugs.add(slug);
    return { name, slug };
  });
  if (inserts.length) await knex('brands').insert(inserts);
};

exports.down = (knex) => knex.schema.dropTableIfExists('brands');
