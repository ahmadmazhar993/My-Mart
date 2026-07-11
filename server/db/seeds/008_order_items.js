exports.seed = function addOrderItems(knex) {
  return knex('order_items').insert([
    {
      order_id: knex.raw('(SELECT "orderID" FROM orders WHERE "trackingNumber" = \'AHM-TRK-001\')'),
      product_id: knex.raw('(SELECT "productID" FROM products WHERE sku = \'ELEC-A54\')'),
      seller_id: knex.raw('(SELECT "sellerID" FROM sellers WHERE "shopName" = \'AHM Electronics\')'),
      quantity: 2,
      unitPrice: 79999,
      totalPrice: 159998,
    },
  ]);
};
