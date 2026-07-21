exports.seed = async function addOrderItems(knex) {
  const order = await knex('orders').select('orderID').where('trackingNumber', 'AHM-TRK-001').first();
  const product = await knex('products').select('productID').where('sku', 'ELEC-A54').first();
  const seller = await knex('sellers').select('sellerID').where('shopName', 'AHM Electronics').first();

  if (!order || !product || !seller) {
    return;
  }

  const existingItem = await knex('order_items').select('orderItemID').where({ order_id: order.orderID, product_id: product.productID }).first();

  if (!existingItem) {
    await knex('order_items').insert({
      order_id: order.orderID,
      product_id: product.productID,
      seller_id: seller.sellerID,
      quantity: 2,
      unitPrice: 79999,
      totalPrice: 159998,
    });
  }
};
