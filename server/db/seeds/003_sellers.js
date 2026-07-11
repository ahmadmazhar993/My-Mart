exports.seed = function addSellers(knex) {
  return knex('sellers').insert([
    {
      user_id: knex.raw('(SELECT "userID" FROM "user" WHERE email = \'seller@ahmmart.com\')'),
      shopName: 'AHM Electronics',
      shopDescription: 'Official electronics store by AHM Mart',
      shopLogoUrl: null,
      rating: 4.8,
      totalSales: 520,
      status: 'approved',
      approvedOn: knex.fn.now(),
    },
    {
      user_id: knex.raw('(SELECT "userID" FROM "user" WHERE email = \'seller2@ahmmart.com\')'),
      shopName: 'AHM Fashion Hub',
      shopDescription: 'Trendy clothing and lifestyle products',
      shopLogoUrl: null,
      rating: 4.6,
      totalSales: 380,
      status: 'approved',
      approvedOn: knex.fn.now(),
    },
  ]);
};
