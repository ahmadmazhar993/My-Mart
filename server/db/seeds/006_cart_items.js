exports.seed = function addCartItems(knex) {
  return knex('cart_items').insert([
    {
      cart_id: knex.raw('(SELECT "cartID" FROM carts LIMIT 1)'),
      product_id: knex.raw('(SELECT "productID" FROM products WHERE sku = \'ELEC-A54\')'),
      quantity: 1,
      price: 79999,
    },
  ]);
};
