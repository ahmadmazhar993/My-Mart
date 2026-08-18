import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProductImage from '../components/ProductImage';
import { EmptyState } from '../components/ui';
import { useToast } from '../components/ToastProvider';
import { getShippingInfo } from '../config/shipping';
import { useAuthStore, useCartStore } from '../store';
import { formatPrice } from '../utils/format';
import { buildProductPath } from '../utils/product';

const Cart = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { cart, removeItem, updateQuantity, clearCart, clearBuyNowItems } = useCartStore();
  const { addToast } = useToast();

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingInfo = getShippingInfo(subtotal);
  const shipping = shippingInfo.cost;
  const total = subtotal + shipping;
  const totalItemCount = cart.reduce((n, item) => n + item.quantity, 0);

  const handleCheckout = () => {
    clearBuyNowItems();
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout');
      return;
    }
    navigate('/checkout');
  };

  const handleQuantityDecrease = (item) => {
    updateQuantity(item, Math.max(1, item.quantity - 1));
  };

  const handleQuantityIncrease = (item) => {
    const availableStock = Number(item.stock_quantity ?? item.stock ?? 0);
    if (availableStock > 0 && item.quantity >= availableStock) {
      addToast(`You already have the maximum available quantity (${availableStock}) in your cart.`, 'error');
      return;
    }
    updateQuantity(item, item.quantity + 1);
  };

  return (
    <div className="container-main py-6 animate-fade-in">
      <h1 className="text-xl font-bold text-dark mb-6">
        Shopping Cart {cart.length > 0 && <span className="text-gray-400 font-normal">({totalItemCount} {totalItemCount === 1 ? 'item' : 'items'})</span>}
      </h1>

      {cart.length === 0 ? (
        <div className="bg-white rounded-lg shadow-card">
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
              <div
                key={`${item.id}-${item.variant_sku || ''}`}
                className="bg-white rounded-lg shadow-card p-3 sm:p-4 flex gap-3 sm:gap-4 border border-transparent hover:border-gray-100 transition"
              >
                {/* <Link to={buildProductPath({ id: item.id, name: item.name })} className="flex-shrink-0 w-16 sm:w-20 h-16 sm:h-20">
                  <ProductImage product={item} className="w-full h-full rounded-md object-cover border border-gray-100" />
                </Link> */}
                  <Link to={buildProductPath({ id: item.id, name: item.product_name || item.name })} className="flex-shrink-0 w-16 sm:w-20 h-16 sm:h-20 block rounded-md border border-gray-100 overflow-hidden">
                  <ProductImage product={item} variant={item.variant || null} className="w-full h-full object-cover" />
                </Link>

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <Link
                      to={buildProductPath({ id: item.id, name: item.product_name || item.name })}
                      className="font-medium text-sm sm:text-base text-dark hover:text-primary line-clamp-2"
                    >
                      {item.name}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-primary font-bold text-sm">{formatPrice(item.price)}</p>
                      {item.variant_label && (
                        <>
                          <span className="text-gray-300">•</span>
                          <p className="text-xs text-gray-500">{item.variant_label}</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2">
                    <div className="flex items-center border border-gray-200 rounded-full">
                      <button
                        type="button"
                        onClick={() => handleQuantityDecrease(item)}
                        disabled={item.quantity <= 1}
                        className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 rounded-full disabled:opacity-30 disabled:hover:bg-transparent"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="text-sm font-semibold w-7 text-center">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleQuantityIncrease(item)}
                        className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 rounded-full"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item)}
                      className="text-red-500 text-xs font-medium hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 flex flex-col justify-between items-end">
                  <p className="font-bold text-sm sm:text-base text-dark">{formatPrice(item.price * item.quantity)}</p>
                  {item.quantity > 1 && (
                    <p className="text-[11px] text-gray-400">{formatPrice(item.price)} each</p>
                  )}
                </div>
              </div>
            ))}

            <div className="pt-2">
              <Link to="/products" className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1">
                &larr; Continue Shopping
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-card p-4 sm:p-6 h-fit lg:sticky lg:top-36">
            <h2 className="font-bold text-base sm:text-lg mb-4">Order Summary</h2>

            {/* Shipping tier nudge */}
            {shippingInfo.nextTier ? (
              <div className="mb-4 rounded-lg border border-primary/20 bg-primary-50/50 p-3">
                <p className="text-xs text-gray-600 mb-2">
                  {shippingInfo.nextTier.cost === 0 ? (
                    <>Add <span className="font-semibold text-primary">{formatPrice(shippingInfo.amountToNextTier)}</span> more for <span className="font-semibold text-green-600">FREE delivery</span></>
                  ) : (
                    <>Add <span className="font-semibold text-primary">{formatPrice(shippingInfo.amountToNextTier)}</span> more to cut delivery to <span className="font-semibold text-primary">{formatPrice(shippingInfo.nextTier.cost)}</span></>
                  )}
                </p>
                <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-green-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (subtotal / shippingInfo.nextTier.minSubtotal) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 flex items-center gap-1.5">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                You've unlocked FREE delivery!
              </div>
            )}

            <div className="space-y-2 sm:space-y-3 text-sm mb-4 pb-4 border-b">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal ({totalItemCount} {totalItemCount === 1 ? 'item' : 'items'})</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Delivery</span>
                <span className={shipping === 0 ? 'text-green-600 font-medium' : 'font-medium text-amber-600'}>
                  {shipping === 0 ? 'FREE' : formatPrice(shipping)}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-baseline font-bold text-base sm:text-lg mb-6">
              <span>Total</span>
              <span className="text-primary">{formatPrice(total)}</span>
            </div>

            <button type="button" onClick={handleCheckout} className="btn-primary w-full py-2.5 sm:py-3 mb-2 text-sm sm:text-base">
              Proceed to Checkout
            </button>
            <button
              type="button"
              onClick={clearCart}
              className="btn-secondary w-full py-2 sm:py-2.5 text-xs sm:text-sm color-red-500 hover:bg-red-50 hover:text-red-600"
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