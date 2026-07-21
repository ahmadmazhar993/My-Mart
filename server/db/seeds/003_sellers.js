exports.seed = async function addSellers(knex) {
  const sellerEmails = ['seller@ahmmart.com', 'seller2@ahmmart.com'];
  const users = await knex('user').select('userID', 'email').whereIn('email', sellerEmails);
  const userMap = new Map(users.map((user) => [user.email, user.userID]));

  const seedSellers = [
    {
      user_id: userMap.get('seller@ahmmart.com'),
      shopName: 'AHM Electronics',
      shopDescription: 'Official electronics store by AHM Mart',
      shopLogoUrl: null,
      rating: 4.8,
      totalSales: 520,
      status: 'approved',
      approvedOn: knex.fn.now(),
    },
    {
      user_id: userMap.get('seller2@ahmmart.com'),
      shopName: 'AHM Fashion Hub',
      shopDescription: 'Trendy clothing and lifestyle products',
      shopLogoUrl: null,
      rating: 4.6,
      totalSales: 380,
      status: 'approved',
      approvedOn: knex.fn.now(),
    },
  ];

  const existing = await knex('sellers').select('user_id').whereIn('user_id', seedSellers.map((seller) => seller.user_id).filter(Boolean));
  const existingUserIds = new Set(existing.map((seller) => seller.user_id));
  const missingSellers = seedSellers.filter((seller) => seller.user_id && !existingUserIds.has(seller.user_id));

  if (missingSellers.length > 0) {
    await knex('sellers').insert(missingSellers);
  }
};
