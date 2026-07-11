exports.seed = function addReviews(knex) {
  return knex('reviews').insert([
    {
      product_id: knex.raw('(SELECT "productID" FROM products WHERE sku = \'ELEC-A54\')'),
      user_id: knex.raw('(SELECT "userID" FROM "user" WHERE email = \'customer@ahmmart.com\')'),
      order_id: knex.raw('(SELECT "orderID" FROM orders WHERE "trackingNumber" = \'AHM-TRK-001\')'),
      rating: 5,
      comment: 'Excellent phone, very happy with the battery life.',
      images: JSON.stringify([]),
      helpfulCount: 12,
      verifiedPurchase: true,
    },
  ]);
};
