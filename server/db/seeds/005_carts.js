exports.seed = function addCarts(knex) {
  return knex('carts').insert([
    {
      user_id: knex.raw('(SELECT "userID" FROM "user" WHERE email = \'customer@ahmmart.com\')'),
    },
  ]);
};
