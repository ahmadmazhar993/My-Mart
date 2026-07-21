exports.seed = async function addCategories(knex) {
  const seedCategories = [
    {
      name: 'Electronics',
      description: 'Phones, laptops, gadgets and more',
      slug: 'electronics',
      parentId: null,
      displayOrder: 1,
      isActive: true,
    },
    {
      name: 'Fashion',
      description: 'Clothing, shoes and accessories',
      slug: 'clothing',
      parentId: null,
      displayOrder: 2,
      isActive: true,
    },
    {
      name: 'Accessories',
      description: 'Bags, wallets, watches and more',
      slug: 'accessories',
      parentId: null,
      displayOrder: 3,
      isActive: true,
    },
    {
      name: 'Home & Living',
      description: 'Furniture, kitchen and home essentials',
      slug: 'home',
      parentId: null,
      displayOrder: 4,
      isActive: true,
    },
    {
      name: 'Beauty',
      description: 'Skincare, makeup and personal care',
      slug: 'beauty',
      parentId: null,
      displayOrder: 5,
      isActive: true,
    },
    {
      name: 'Sports',
      description: 'Fitness gear and outdoor equipment',
      slug: 'sports',
      parentId: null,
      displayOrder: 6,
      isActive: true,
    },
    {
      name: 'Groceries',
      description: 'Daily essentials and food items',
      slug: 'groceries',
      parentId: null,
      displayOrder: 7,
      isActive: true,
    },
    {
      name: 'Toys',
      description: 'Toys and games for all ages',
      slug: 'toys',
      parentId: null,
      displayOrder: 8,
      isActive: true,
    },
  ];

  const existing = await knex('categories').select('slug').whereIn('slug', seedCategories.map((category) => category.slug));
  const existingSlugs = new Set(existing.map((category) => category.slug));
  const missingCategories = seedCategories.filter((category) => !existingSlugs.has(category.slug));

  if (missingCategories.length > 0) {
    await knex('categories').insert(missingCategories);
  }
};
