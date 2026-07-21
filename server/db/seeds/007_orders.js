exports.seed = async function addOrders(knex) {
  const customer = await knex('user').select('userID').where('email', 'customer@ahmmart.com').first();

  if (!customer) {
    return;
  }

  const existingOrders = await knex('orders').select('trackingNumber').whereIn('trackingNumber', ['AHM-TRK-001', null]);
  const existingTrackingNumbers = new Set(existingOrders.map((order) => order.trackingNumber));

  const orders = [
    {
      user_id: customer.userID,
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
      user_id: customer.userID,
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
  ];

  const newOrders = orders.filter((order) => !existingTrackingNumbers.has(order.trackingNumber));

  if (newOrders.length > 0) {
    await knex('orders').insert(newOrders);
  }
};
