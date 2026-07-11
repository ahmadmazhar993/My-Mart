const { StatusCodes } = require('http-status-codes');
const db = require('../../../db');
const { mapCartItem, mapProduct } = require('../../../libs/serializers');

async function getCart(req, res) {
  try {
    const userId = req.activeUser.userID;
    const cart = await db('carts').where({ user_id: userId }).first();

    if (!cart) {
      return res.status(StatusCodes.OK).json({ success: true, data: { items: [] } });
    }

    const items = await db('cart_items').where({ cart_id: cart.cartID });
    const productIds = items.map((item) => item.product_id);
    const products = productIds.length
      ? await db('products').whereIn('productID', productIds)
      : [];
    const productMap = products.reduce((acc, product) => {
      acc[product.productID] = product;
      return acc;
    }, {});

    return res.status(StatusCodes.OK).json({
      success: true,
      data: {
        cart: { id: cart.cartID, user_id: cart.user_id },
        items: items.map((item) => mapCartItem(item, productMap[item.product_id])),
      },
    });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message || 'Failed to load cart',
    });
  }
}

async function addToCart(req, res) {
  try {
    const userId = req.activeUser.userID;
    let cart = await db('carts').where({ user_id: userId }).first();

    if (!cart) {
      [cart] = await db('carts').insert({ user_id: userId }).returning('*');
    }

    const { product_id, quantity, price } = req.body;
    const product = await db('products').where({ productID: product_id }).first();

    if (!product) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Product not found' });
    }

    const unitPrice = price ?? Number(product.discountPrice ?? product.price);
    const existingItem = await db('cart_items')
      .where({ cart_id: cart.cartID, product_id })
      .first();

    if (existingItem) {
      await db('cart_items')
        .where({ cartItemID: existingItem.cartItemID })
        .update({
          quantity: existingItem.quantity + quantity,
          updatedOn: db.fn.now(),
        });
      return res.status(StatusCodes.OK).json({
        success: true,
        data: { itemId: existingItem.cartItemID },
      });
    }

    const [item] = await db('cart_items')
      .insert({
        cart_id: cart.cartID,
        product_id,
        quantity,
        price: unitPrice,
      })
      .returning('*');

    return res.status(StatusCodes.CREATED).json({ success: true, data: { itemId: item.cartItemID } });
  } catch (err) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: err.message || 'Failed to add item to cart',
    });
  }
}

async function updateCartItem(req, res) {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    await db('cart_items')
      .where({ cartItemID: itemId })
      .update({ quantity, updatedOn: db.fn.now() });

    return res.status(StatusCodes.OK).json({ success: true, message: 'Cart item updated' });
  } catch (err) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: err.message || 'Failed to update cart item',
    });
  }
}

async function removeFromCart(req, res) {
  try {
    const { itemId } = req.params;
    await db('cart_items').where({ cartItemID: itemId }).del();
    return res.status(StatusCodes.OK).json({ success: true, message: 'Item removed' });
  } catch (err) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: err.message || 'Failed to remove cart item',
    });
  }
}

async function clearCart(req, res) {
  try {
    const userId = req.activeUser.userID;
    const cart = await db('carts').where({ user_id: userId }).first();
    if (cart) {
      await db('cart_items').where({ cart_id: cart.cartID }).del();
    }
    return res.status(StatusCodes.OK).json({ success: true, message: 'Cart cleared' });
  } catch (err) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: err.message || 'Failed to clear cart',
    });
  }
}

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
};
