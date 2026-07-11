exports.seed = function addOrders(knex) {
  return knex('orders').insert([
    {
      user_id: knex.raw('(SELECT "userID" FROM "user" WHERE email = \'customer@ahmmart.com\')'),
      totalPrice: 159998,
      taxAmount: 0,
      shippingCost: 0,
      discountAmount: 0,
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentMethod: 'online',
      shippingAddress: '123 Main St, Karachi',
      trackingNumber: 'AHM-TRK-001',
    },
    {
      user_id: knex.raw('(SELECT "userID" FROM "user" WHERE email = \'customer@ahmmart.com\')'),
      totalPrice: 3999,
      taxAmount: 0,
      shippingCost: 0,
      discountAmount: 0,
      status: 'pending',
      paymentStatus: 'unpaid',
      paymentMethod: 'cod',
      shippingAddress: '123 Main St, Karachi',
      trackingNumber: null,
    },
  ]);
};
