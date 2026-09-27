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
    <div className="container-main animate-fade-in py-6">
      <h1 className="mb-6 text-xl font-bold tracking-tight text-dark">
        Shopping Cart {cart.length > 0 && <span className="font-normal text-gray-400">({totalItemCount} {totalItemCount === 1 ? 'item' : 'items'})</span>}
      </h1>

      {cart.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white shadow-card">
          <EmptyState
            icon="🛒"
            title="Your cart is empty"
            description="Looks like you haven't added anything to your cart yet."
            action={
              <Link
                to="/products"
                className="inline-flex items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600"
              >
                Start Shopping
              </Link>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
          <div className="space-y-3 lg:col-span-2">
            {cart.map((item) => (
              <div
                key={`${item.id}-${item.variant_sku || ''}`}
                className="flex gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-card transition hover:shadow-card-hover sm:gap-4 sm:p-4"
              >
                <Link
                  to={buildProductPath({ id: item.id, name: item.product_name || item.name })}
                  className="block h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-gray-100 sm:h-20 sm:w-20"
                >
                  <ProductImage product={item} variant={item.variant || null} className="h-full w-full object-cover" />
                </Link>

                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div>
                    <Link
                      to={buildProductPath({ id: item.id, name: item.product_name || item.name })}
                      className="line-clamp-2 text-sm font-medium text-dark transition hover:text-primary sm:text-base"
                    >
                      {item.name}
                    </Link>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-sm font-bold text-primary">{formatPrice(item.price)}</p>
                      {item.variant_label && (
                        <>
                          <span className="text-gray-300">•</span>
                          <p className="text-xs text-gray-500">{item.variant_label}</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3">
                    <div className="flex items-center rounded-full border border-gray-200 bg-gray-50">
                      <button
                        type="button"
                        onClick={() => handleQuantityDecrease(item)}
                        disabled={item.quantity <= 1}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 transition hover:bg-white hover:text-primary disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="w-7 text-center text-sm font-semibold text-gray-800">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleQuantityIncrease(item)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 transition hover:bg-white hover:text-primary"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item)}
                      className="rounded-md px-1.5 py-0.5 text-xs font-medium text-red-500 transition hover:bg-red-50 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="flex flex-shrink-0 flex-col items-end justify-between text-right">
                  <p className="text-sm font-bold text-dark sm:text-base">{formatPrice(item.price * item.quantity)}</p>
                  {item.quantity > 1 && (
                    <p className="text-[11px] text-gray-400">{formatPrice(item.price)} each</p>
                  )}
                </div>
              </div>
            ))}

            <div className="pt-2">
              <Link
                to="/products"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary transition hover:underline"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Continue Shopping
              </Link>
            </div>
          </div>

          {/* Order Summary */}
          <div className="h-fit rounded-xl border border-gray-100 bg-white p-4 shadow-card lg:sticky lg:top-36 sm:p-6">
            <h2 className="mb-4 text-base font-bold text-dark sm:text-lg">Order Summary</h2>

            {shippingInfo.nextTier ? (
              <div className="mb-4 rounded-lg border border-primary-100 bg-primary-50/50 p-3">
                <p className="mb-2 text-xs text-gray-600">
                  {shippingInfo.nextTier.cost === 0 ? (
                    <>Add <span className="font-semibold text-primary">{formatPrice(shippingInfo.amountToNextTier)}</span> more for <span className="font-semibold text-emerald-600">FREE delivery</span></>
                  ) : (
                    <>Add <span className="font-semibold text-primary">{formatPrice(shippingInfo.amountToNextTier)}</span> more to cut delivery to <span className="font-semibold text-primary">{formatPrice(shippingInfo.nextTier.cost)}</span></>
                  )}
                </p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (subtotal / shippingInfo.nextTier.minSubtotal) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="mb-4 flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                You've unlocked FREE delivery!
              </div>
            )}

            <div className="mb-4 space-y-2 border-b border-gray-100 pb-4 text-sm sm:space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal ({totalItemCount} {totalItemCount === 1 ? 'item' : 'items'})</span>
                <span className="font-medium text-gray-800">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Delivery</span>
                <span className={shipping === 0 ? 'font-medium text-emerald-600' : 'font-medium text-amber-600'}>
                  {shipping === 0 ? 'FREE' : formatPrice(shipping)}
                </span>
              </div>
            </div>

            <div className="mb-6 flex items-baseline justify-between text-base font-bold sm:text-lg">
              <span>Total</span>
              <span className="text-primary">{formatPrice(total)}</span>
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              className="mb-2 w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600 active:bg-primary-700 sm:py-3 sm:text-base"
            >
              Proceed to Checkout
            </button>
            <button
              type="button"
              onClick={clearCart}
              className="w-full rounded-lg border border-gray-200 bg-white py-2 text-xs font-medium text-gray-600 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 sm:py-2.5 sm:text-sm"
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