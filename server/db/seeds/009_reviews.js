exports.seed = async function addReviews(knex) {
  const product = await knex('products').select('productID').where('sku', 'ELEC-A54').first();
  const customer = await knex('user').select('userID').where('email', 'customer@ahmmart.com').first();
  const order = await knex('orders').select('orderID').where('trackingNumber', 'AHM-TRK-001').first();

  if (!product || !customer || !order) {
    return;
  }

  const existingReview = await knex('reviews').select('reviewID').where({ product_id: product.productID, user_id: customer.userID }).first();

  if (!existingReview) {
    await knex('reviews').insert({
      product_id: product.productID,
      user_id: customer.userID,
      order_id: order.orderID,
      rating: 5,
      comment: 'Excellent phone, very happy with the battery life.',
      images: JSON.stringify([]),
      helpfulCount: 12,
      verifiedPurchase: true,
    });
  }
};
