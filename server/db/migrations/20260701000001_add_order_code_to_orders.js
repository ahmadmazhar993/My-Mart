exports.up = async function addOrderCodeToOrders(knex) {
  await knex.schema.alterTable('orders', (table) => {
    table.string('orderCode', 20).nullable().unique();
  });

  const orders = await knex('orders').select('orderID');

  for (const order of orders) {
    let code = null;
    let attempts = 0;

    while (!code && attempts < 10) {
      attempts += 1;
      const candidate = `AHM-${String(Math.floor(100000 + Math.random() * 900000)).padStart(6, '0')}`;
      const existingOrder = await knex('orders').where({ orderCode: candidate }).first();

      if (!existingOrder) {
        code = candidate;
      }
    }

    if (!code) {
      throw new Error('Failed to generate unique order codes for existing orders');
    }

    await knex('orders').where({ orderID: order.orderID }).update({ orderCode: code });
  }
};

exports.down = function removeOrderCodeFromOrders(knex) {
  return knex.schema.alterTable('orders', (table) => {
    table.dropColumn('orderCode');
  });
};
