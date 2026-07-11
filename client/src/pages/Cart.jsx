import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProductImage from '../components/ProductImage';
import { EmptyState } from '../components/ui';
import { useAuthStore, useCartStore } from '../store';
import { formatPrice } from '../utils/format';

const Cart = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { cart, removeItem, updateQuantity, clearCart, clearBuyNowItems } = useCartStore();

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal > 1000 || subtotal === 0 ? 0 : 150;
  const total = subtotal + shipping;

  const handleCheckout = () => {
    clearBuyNowItems();
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout');
      return;
    }
    navigate('/checkout');
  };

  return (
    <div className="container-main py-6 animate-fade-in">
      <h1 className="text-xl font-bold text-dark mb-6">Shopping Cart ({cart.length} items)</h1>

      {cart.length === 0 ? (
        <div className="bg-white rounded-sm shadow-card">
          <EmptyState
            icon="🛒"
            title="Your cart is empty"
            description="Looks like you haven't added anything to your cart yet."
            action={<Link to="/products" className="btn-primary">Start Shopping</Link>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="lg:col-span-2 space-y-3">
            {cart.map((item) => (
              <div key={item.id} className="bg-white rounded-sm shadow-card p-3 sm:p-4 flex gap-3 sm:gap-4">
                <Link to={`/products/${item.id}`} className="flex-shrink-0 w-16 sm:w-20 h-16 sm:h-20">
                  <ProductImage product={item} className="w-full h-full rounded-sm" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/products/${item.id}`} className="font-medium text-sm sm:text-base text-dark hover:text-primary line-clamp-2">
                    {item.name}
                  </Link>
                  <p className="text-primary font-bold text-sm mt-1">{formatPrice(item.price)}</p>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2">
                    <div className="flex items-center border border-gray-300 rounded-sm">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                        className="px-2 sm:px-2.5 py-1 hover:bg-gray-100 text-sm"
                      >
                        −
                      </button>
                      <span className="px-2 sm:px-3 py-1 border-x border-gray-300 text-sm min-w-[36px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-2 sm:px-2.5 py-1 hover:bg-gray-100 text-sm"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-red-500 text-xs font-medium hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-sm sm:text-base">{formatPrice(item.price * item.quantity)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-sm shadow-card p-4 sm:p-6 h-fit lg:sticky lg:top-36">
            <h2 className="font-bold text-base sm:text-lg mb-4">Order Summary</h2>
            <div className="space-y-2 sm:space-y-3 text-sm mb-4 pb-4 border-b">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Shipping</span>
                <span className="font-medium">{shipping === 0 ? 'FREE' : formatPrice(shipping)}</span>
              </div>
              {shipping > 0 && (
                <p className="text-xs text-primary">Add {formatPrice(1000 - subtotal)} more for free shipping</p>
              )}
            </div>
            <div className="flex justify-between font-bold text-base sm:text-lg mb-6">
              <span>Total</span>
              <span className="text-primary">{formatPrice(total)}</span>
            </div>
            <button type="button" onClick={handleCheckout} className="btn-primary w-full py-2.5 sm:py-3 mb-2 text-sm sm:text-base">
              Proceed to Checkout
            </button>
            <button
              type="button"
              onClick={clearCart}
              className="btn-secondary w-full py-2 sm:py-2.5 text-xs sm:text-sm"
            >
              Clear Cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
