exports.seed = async function addCarts(knex) {
  const customer = await knex('user').select('userID').where('email', 'customer@ahmmart.com').first();

  if (!customer) {
    return;
  }

  const existingCart = await knex('carts').select('cartID').where('user_id', customer.userID).first();

  if (!existingCart) {
    await knex('carts').insert({ user_id: customer.userID });
  }
};
