exports.seed = async function addCartItems(knex) {
  const cart = await knex('carts').select('cartID').first();
  const product = await knex('products').select('productID').where('sku', 'ELEC-A54').first();

  if (!cart || !product) {
    return;
  }

  const existingItem = await knex('cart_items').select('cartItemID').where({ cart_id: cart.cartID, product_id: product.productID }).first();

  if (!existingItem) {
    await knex('cart_items').insert({
      cart_id: cart.cartID,
      product_id: product.productID,
      quantity: 1,
      price: 79999,
    });
  }
};
