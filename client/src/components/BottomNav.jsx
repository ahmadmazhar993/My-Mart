import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuthStore, useCartStore } from '../store';
import { NAV_CATEGORIES } from '../config/categories';
import { getCategoryIcon } from '../utils/product';

const icon = (path) => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
    <path d={path} />
  </svg>
);

const ICONS = {
  home: icon('M3 11l9-8 9 8M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10'),
  categories: icon('M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z'),
  cart: icon('M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z'),
  account: icon('M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'),
};

const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];
const matches = (pathname, path) => pathname === path || pathname.startsWith(`${path}/`);

// Single source of truth for where the phone bottom bar appears. Product pages use their own
// sticky purchase bar and checkout stays distraction-free.
export const shouldShowBottomNav = (pathname) =>
  !AUTH_PATHS.some((p) => matches(pathname, p)) && !pathname.startsWith('/products/') && !matches(pathname, '/checkout');

const itemClass = (active) =>
  `relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
    active ? 'text-primary' : 'text-gray-500 active:text-primary'
  }`;

// Fixed bottom tab bar for phones. Hidden from `md` up, where the header handles navigation.
const BottomNav = () => {
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuthStore();
  const cart = useCartStore((state) => state.cart);
  const [sheetOpen, setSheetOpen] = useState(false);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    setSheetOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!sheetOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setSheetOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sheetOpen]);

  const accountPath = isAuthenticated ? '/profile' : '/login';

  return (
    <>
      {sheetOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-label="Shop by category">
          <button
            type="button"
            aria-label="Close categories"
            className="absolute inset-0 bg-black/40"
            onClick={() => setSheetOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-2xl bg-white pb-safe shadow-2xl animate-slide-up">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
              <h2 className="text-base font-bold text-dark">Shop by category</h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Close"
                className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 p-4">
              <Link
                to="/products"
                className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-100 bg-primary-50 p-3 text-center text-xs font-semibold text-primary-700"
              >
                <span className="text-2xl" aria-hidden="true">🛍️</span>
                All products
              </Link>
              {NAV_CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  to={`/products?category=${cat.slug}`}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-100 p-3 text-center text-xs font-medium text-gray-700 active:bg-primary-50"
                >
                  <span className="text-2xl" aria-hidden="true">{getCategoryIcon(cat.slug)}</span>
                  <span className="line-clamp-2">{cat.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white pb-safe shadow-[0_-2px_12px_rgba(0,0,0,0.06)] md:hidden"
      >
        <div className="flex h-14 items-stretch">
          <NavLink to="/" end className={({ isActive }) => itemClass(isActive)}>
            {ICONS.home}
            <span>Home</span>
          </NavLink>
          <button type="button" onClick={() => setSheetOpen(true)} className={itemClass(sheetOpen)} aria-haspopup="dialog">
            {ICONS.categories}
            <span>Categories</span>
          </button>
          <NavLink to="/cart" className={({ isActive }) => itemClass(isActive)}>
            {ICONS.cart}
            {cartCount > 0 && (
              <span className="absolute left-1/2 top-1.5 ml-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
            <span>Cart</span>
          </NavLink>
          <NavLink to={accountPath} className={({ isActive }) => itemClass(isActive && !sheetOpen)}>
            {ICONS.account}
            <span>{isAuthenticated ? 'Account' : 'Login'}</span>
          </NavLink>
        </div>
      </nav>
    </>
  );
};

export default BottomNav;
