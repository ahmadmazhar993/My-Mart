exports.seed = function addPayments(knex) {
  return knex('payments').insert([
    {
      order_id: knex.raw('(SELECT "orderID" FROM orders WHERE "trackingNumber" = \'AHM-TRK-001\')'),
      paymentMethod: 'online',
      amount: 159998,
      status: 'completed',
      transactionID: 'txn_ahm_001',
      metadata: JSON.stringify({ processor: 'bank_transfer' }),
      processedOn: new Date(),
    },
  ]);
};
