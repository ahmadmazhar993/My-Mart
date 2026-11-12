import React, { useEffect } from 'react';
import { Check, ShoppingCart } from 'lucide-react';
import { formatPrice } from '../../utils/format';

// Phone-only purchase bar. It shows the total for the chosen quantity next to the two actions:
// Add to cart (primary) and Buy now (secondary). Layout reserves matching space below the footer
// (see Layout.jsx) and the bar respects the bottom safe area, so it never covers content.
const StickyPurchaseBar = ({ total, isOutOfStock, added, onAddToCart, onBuyNow }) => {
  // Lift toast messages above the bar while it is on screen.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--toast-offset', '84px');
    // Keyboard focus and in-page scrolling stop short of the bar instead of ending up underneath it.
    root.style.scrollPaddingBottom = '96px';
    return () => {
      root.style.removeProperty('--toast-offset');
      root.style.removeProperty('scroll-padding-bottom');
    };
  }, []);

  return (
    <div
      role="region"
      aria-label="Purchase"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 px-3 pt-2.5 backdrop-blur md:hidden"
      style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}
    >
      {isOutOfStock ? (
        <button type="button" disabled className="h-12 w-full cursor-not-allowed rounded-xl bg-gray-200 text-sm font-semibold text-gray-500">
          Out of stock
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-shrink-0 pr-1">
            <p className="text-[11px] font-medium leading-none text-gray-500">Total</p>
            <p className="mt-1 whitespace-nowrap text-base font-extrabold leading-none text-gray-900">{formatPrice(total)}</p>
          </div>
          <button
            type="button"
            onClick={onAddToCart}
            className={`flex h-12 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-white transition active:scale-[0.98] ${added ? 'bg-primary-800' : 'bg-primary-600 hover:bg-primary-700'}`}
          >
            {added ? <Check className="h-4 w-4" aria-hidden="true" /> : <ShoppingCart className="h-4 w-4" aria-hidden="true" />}
            <span className="truncate">{added ? 'Added' : 'Add to cart'}</span>
          </button>
          <button
            type="button"
            onClick={onBuyNow}
            className="h-12 min-w-0 flex-1 rounded-xl border border-primary-600 bg-white px-2 text-sm font-semibold text-primary-700 transition hover:bg-primary-50 active:scale-[0.98]"
          >
            <span className="truncate">Buy now</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default StickyPurchaseBar;
