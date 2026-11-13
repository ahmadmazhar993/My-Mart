import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ShoppingCart, Trash2 } from 'lucide-react';
import ProductImage from '../components/ProductImage';
import QuantityStepper from '../components/product/QuantityStepper';
import { EmptyState } from '../components/ui';
import { useToast } from '../components/ToastProvider';
import { getShippingInfo } from '../config/shipping';
import { PAYMENT_METHOD_LABELS } from '../config/paymentAccounts';
import { useAuthStore, useCartStore } from '../store';
import { formatPrice } from '../utils/format';
import { buildProductPath } from '../utils/product';
import usePageMeta from '../hooks/usePageMeta';

const Cart = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { cart, removeItem, updateQuantity, clearCart, clearBuyNowItems } = useCartStore();
  const { addToast } = useToast();

  // Private page: keep it out of search results.
  usePageMeta({ title: 'Shopping Cart', description: 'Review the items in your AHM Mart cart.', path: '/cart', noindex: true });

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingInfo = getShippingInfo(subtotal);
  const shipping = shippingInfo.cost;
  const total = subtotal + shipping;
  const totalItemCount = cart.reduce((n, item) => n + item.quantity, 0);
  const itemsLabel = `${totalItemCount} ${totalItemCount === 1 ? 'item' : 'items'}`;

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
    <div className="container-main animate-fade-in py-4 pb-24 sm:py-6 lg:pb-6">
      <div className="relative mb-4 overflow-hidden rounded-2xl bg-gradient-to-r from-primary-800 via-primary-700 to-primary-600 p-5 text-white shadow-soft sm:mb-6 sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-white/10" aria-hidden="true" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <ShoppingCart className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight">Shopping cart</h1>
            <p className="text-sm text-primary-100" aria-live="polite">{cart.length > 0 ? itemsLabel : 'Nothing here yet'}</p>
          </div>
        </div>
      </div>

      {cart.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-card">
          <EmptyState
            icon="🛒"
            title="Your cart is empty"
            description="Looks like you haven't added anything to your cart yet."
            action={
              <Link
                to="/products"
                className="inline-flex min-h-[44px] items-center rounded-xl bg-primary-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
              >
                Start shopping
              </Link>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
          <div className="lg:col-span-2">
            <ul className="space-y-3">
              {cart.map((item) => {
                const path = buildProductPath({ id: item.id, name: item.product_name || item.name });
                const availableStock = Number(item.stock_quantity ?? item.stock ?? 0);
                const atMax = availableStock > 0 && item.quantity >= availableStock;
                return (
                  <li
                    key={`${item.id}-${item.variant_sku || ''}`}
                    className="rounded-2xl border border-gray-100 bg-white p-3 shadow-card sm:p-4"
                  >
                    <div className="flex gap-3 sm:gap-4">
                      <Link
                        to={path}
                        aria-label={`View ${item.name}`}
                        className="block h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-white p-1.5 sm:h-24 sm:w-24"
                      >
                        <ProductImage product={item} variant={item.variant || null} className="h-full w-full" />
                      </Link>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <Link to={path} className="line-clamp-2 text-sm font-medium leading-snug text-dark transition hover:text-primary-700 sm:text-base">
                            {item.name}
                          </Link>
                          <p className="flex-shrink-0 text-sm font-bold text-dark sm:text-base">{formatPrice(item.price * item.quantity)}</p>
                        </div>
                        {item.variant_label && <p className="mt-0.5 text-xs text-gray-500">{item.variant_label}</p>}
                        <p className="mt-1 text-xs text-gray-500">{formatPrice(item.price)} each</p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
                      <QuantityStepper
                        size="md"
                        value={item.quantity}
                        onDecrease={() => handleQuantityDecrease(item)}
                        onIncrease={() => handleQuantityIncrease(item)}
                        disableDecrease={item.quantity <= 1}
                        disableIncrease={atMax}
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(item)}
                        aria-label={`Remove ${item.name} from cart`}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Remove
                      </button>
                    </div>
                    {atMax && <p className="mt-2 text-xs text-amber-700">Maximum available quantity in your cart.</p>}
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center justify-between gap-3 pt-3">
              <Link
                to="/products"
                className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-primary-700 transition hover:underline"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Continue shopping
              </Link>
              <button
                type="button"
                onClick={clearCart}
                className="inline-flex min-h-[44px] items-center px-2 text-sm font-medium text-gray-500 transition hover:text-red-600"
              >
                Clear cart
              </button>
            </div>
          </div>

          {/* Order summary */}
          <aside className="h-fit rounded-2xl border border-gray-100 bg-white p-4 shadow-card sm:p-6 lg:sticky lg:top-36" aria-labelledby="cart-summary-heading">
            <h2 id="cart-summary-heading" className="mb-4 text-base font-bold text-dark sm:text-lg">Order summary</h2>

            {shippingInfo.nextTier ? (
              <div className="mb-4 rounded-xl border border-primary-100 bg-primary-50/60 p-3">
                <p className="mb-2 text-xs text-gray-700">
                  {shippingInfo.nextTier.cost === 0 ? (
                    <>Add <span className="font-semibold text-primary-700">{formatPrice(shippingInfo.amountToNextTier)}</span> more for <span className="font-semibold text-primary-700">free delivery</span></>
                  ) : (
                    <>Add <span className="font-semibold text-primary-700">{formatPrice(shippingInfo.amountToNextTier)}</span> more to cut delivery to <span className="font-semibold text-primary-700">{formatPrice(shippingInfo.nextTier.cost)}</span></>
                  )}
                </p>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200"
                  role="progressbar"
                  aria-label="Progress to the next delivery tier"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(Math.min(100, (subtotal / shippingInfo.nextTier.minSubtotal) * 100))}
                >
                  <div
                    className="h-full rounded-full bg-primary-600 transition-all duration-500"
                    style={{ width: `${Math.min(100, (subtotal / shippingInfo.nextTier.minSubtotal) * 100)}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2.5 text-xs font-semibold text-primary-800">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                You&apos;ve unlocked free delivery
              </div>
            )}

            <dl className="space-y-2.5 border-b border-gray-100 pb-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Subtotal ({itemsLabel})</dt>
                <dd className="font-medium text-gray-800">{formatPrice(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Delivery</dt>
                <dd className={shipping === 0 ? 'font-semibold text-primary-700' : 'font-medium text-gray-800'}>
                  {shipping === 0 ? 'Free' : formatPrice(shipping)}
                </dd>
              </div>
            </dl>

            <div className="my-4 flex items-baseline justify-between">
              <span className="text-base font-bold text-dark">Total</span>
              <span className="text-xl font-extrabold text-primary-700">{formatPrice(total)}</span>
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              className="hidden h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 text-base font-semibold text-white shadow-sm transition hover:bg-primary-700 active:bg-primary-800 lg:flex"
            >
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              Proceed to checkout
            </button>
            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="mb-2 text-xs font-semibold text-gray-600">Pay with</p>
              <ul className="flex flex-wrap gap-2">
                {['cod', 'online'].filter((key) => PAYMENT_METHOD_LABELS[key]).map((key) => (
                  <li key={key} className="rounded-full border border-primary-100 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-800">{PAYMENT_METHOD_LABELS[key]}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-gray-500">Delivery and payment options are confirmed at checkout.</p>
            </div>
          </aside>
        </div>
      )}

      {cart.length > 0 && (
        <div
          className="fixed inset-x-0 bottom-14 z-40 border-t border-gray-200 bg-white/95 px-3 py-2.5 backdrop-blur md:bottom-0 lg:hidden"
          role="region"
          aria-label="Checkout"
        >
          <div className="mx-auto flex max-w-[1280px] items-center gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-gray-500">Total ({itemsLabel})</p>
              <p className="truncate text-lg font-extrabold leading-tight text-primary-700">{formatPrice(total)}</p>
            </div>
            <button
              type="button"
              onClick={handleCheckout}
              className="ml-auto h-12 flex-1 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white transition hover:bg-primary-700 active:bg-primary-800 sm:max-w-xs sm:flex-none sm:px-8"
            >
              Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
