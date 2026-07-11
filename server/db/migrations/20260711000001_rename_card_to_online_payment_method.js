exports.up = async function renameCardToOnlinePaymentMethod(knex) {
  const result = await knex.raw(`
    SELECT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'orders_paymentmethod_enum' AND e.enumlabel = 'card'
    ) as exists
  `);

  if (!result.rows[0]?.exists) {
    return;
  }

  await knex.raw(`ALTER TYPE orders_paymentmethod_enum RENAME VALUE 'card' TO 'online'`);
  await knex('payments').where('paymentMethod', 'card').update({ paymentMethod: 'online' });
};

exports.down = async function revertOnlineToCardPaymentMethod(knex) {
  const result = await knex.raw(`
    SELECT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'orders_paymentmethod_enum' AND e.enumlabel = 'online'
    ) as exists
  `);

  if (!result.rows[0]?.exists) {
    return;
  }

  await knex('payments').where('paymentMethod', 'online').update({ paymentMethod: 'card' });
  await knex.raw(`ALTER TYPE orders_paymentmethod_enum RENAME VALUE 'online' TO 'card'`);
};
