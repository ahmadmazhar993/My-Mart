import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, useCartStore } from '../store';
import { authService } from '../services';

const SearchIcon = () => (
  <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const SearchButtonIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const CartIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const urlSearch = location.pathname === '/products' ? (params.get('search') || '') : '';

  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);
  const { isAuthenticated, user, logout } = useAuthStore();
  const { cart } = useCartStore();

  useEffect(() => {
    setAccountMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!accountMenuOpen) return undefined;

    const handleOutsideClick = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [accountMenuOpen]);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const getProductsPath = (query) => {
    const next = location.pathname === '/products'
      ? new URLSearchParams(location.search)
      : new URLSearchParams();

    if (query) next.set('search', query);
    else next.delete('search');

    const queryString = next.toString();
    return `/products${queryString ? `?${queryString}` : ''}`;
  };

  const getReturnPath = () => {
    const from = location.state?.from;
    if (typeof from === 'string' && from.trim()) return from;
    return '/products';
  };

  useEffect(() => {
    setSearchQuery(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchQuery.trim();
      if (location.pathname === '/products') {
        const current = new URLSearchParams(location.search).get('search') || '';
        if (!trimmed && current) {
          const returnPath = typeof location.state?.from === 'string' ? location.state.from : '';
          if (returnPath) {
            navigate(returnPath, { replace: true });
            return;
          }
        }

        if (trimmed !== current) {
          navigate(getProductsPath(trimmed), { replace: true, state: location.state });
        }
      } else if (trimmed) {
        navigate(getProductsPath(trimmed), {
          state: { from: `${location.pathname}${location.search}` },
        });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      navigate(getProductsPath(trimmed), {
        state: location.pathname === '/products'
          ? location.state
          : { from: `${location.pathname}${location.search}` },
      });
    } else {
      navigate(getReturnPath());
    }
  };

  const categories = [
    { name: 'Accessories', slug: 'accessories' },
    { name: 'Beauty', slug: 'beauty' },
    { name: 'Electronics', slug: 'electronics' },
    { name: 'Fashion', slug: 'clothing' },
    { name: 'Groceries', slug: 'groceries' },
    { name: 'Home & Living', slug: 'home' },
    { name: 'Sports', slug: 'sports' },
    { name: 'Toys & Games', slug: 'toys' },
  ];

  const activeCategory = params.get('category') || '';
  const isAllCategoriesActive = !activeCategory;
  const shouldShowSearchBar = !['/help', '/pages'].some((prefix) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`));

  return (
    <header className="sticky top-0 z-50 shadow-header">
      {/* Announcement bar */}
      <div className="bg-primary text-xs text-white">
        <div className="container-main flex items-center justify-between py-1.5">
          <span>Free shipping on orders over Rs. 2,000</span>
          <div className="hidden items-center gap-4 sm:flex">
            <Link to="/help" className="hover:underline">Help Center</Link>
          </div>
        </div>
      </div>

      {/* Main header row */}
      <div className="border-b border-gray-100 bg-white">
        <div className="container-main flex items-center gap-2 py-3 lg:gap-5">
          <Link to="/" className="flex-shrink-0">
            {/* Mobile */}
            <div className="flex items-center sm:hidden">
              <span className="whitespace-nowrap text-2xl font-extrabold tracking-tight">
                <span className="text-dark">AHM</span>
                <span className="text-primary"> Mart</span>
              </span>
            </div>

            {/* Tablet & Desktop */}
            <div className="hidden flex-col items-center justify-center rounded-lg border-2 border-primary-200 px-2 py-1 sm:flex">
              <img src="/logo.png" alt="AHM Mart Logo" className="h-14 w-14" />
              <span className="text-3xl font-extrabold tracking-tight">
                <span className="text-dark">AHM</span>
                <span className="text-primary"> Mart</span>
              </span>
            </div>
          </Link>

          {shouldShowSearchBar && (
            <form onSubmit={handleSearch} className="hidden max-w-full flex-1 sm:flex">
              <div className="relative flex-1">
                <SearchIcon />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search in AHM Mart"
                  className="w-full rounded-l-lg border border-r-0 border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </div>
              <button
                type="submit"
                className="flex items-center rounded-r-lg bg-primary px-5 text-white transition-colors hover:bg-primary-600"
              >
                <SearchButtonIcon />
              </button>
            </form>
          )}

          <div className="ml-auto flex items-center gap-1 sm:gap-4">
            {isAuthenticated ? (
              <div ref={accountMenuRef} className="relative z-40">
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((open) => !open)}
                  className="flex flex-col items-center rounded-lg px-2 py-1 text-dark transition-colors hover:bg-gray-50 hover:text-primary"
                >
                  <UserIcon />
                  <span className="mt-0.5 hidden max-w-[80px] truncate text-xs md:block">
                    {(user?.firstName || user?.email?.split('@')[0] || 'Account').slice(0, 15)}
                  </span>
                </button>
                <div className={`absolute right-0 top-full z-50 pt-2 ${accountMenuOpen ? 'block' : 'hidden'}`}>
                  <div className="min-w-[180px] overflow-hidden rounded-xl border border-gray-100 bg-white py-1.5 shadow-lg">
                    <Link to="/profile" onClick={() => setAccountMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 transition hover:bg-primary-50 hover:text-primary-700">My Profile</Link>
                    <Link to="/orders" onClick={() => setAccountMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 transition hover:bg-primary-50 hover:text-primary-700">My Orders</Link>
                    <Link to="/wishlist" onClick={() => setAccountMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 transition hover:bg-primary-50 hover:text-primary-700">Wishlist</Link>
                    {user?.role === 'Admin' && (
                      <Link to="/admin" onClick={() => setAccountMenuOpen(false)} className="block px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary-50">Admin Panel</Link>
                    )}
                    <div className="my-1 border-t border-gray-100" />
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await authService.logout();
                        } catch (err) {
                          // ignore errors from server logout
                        }
                        useAuthStore.getState().logout();
                        setAccountMenuOpen(false);
                        navigate('/login');
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link to="/login" className="flex flex-col items-center rounded-lg px-2 py-1 text-dark transition-colors hover:bg-gray-50 hover:text-primary">
                <UserIcon />
                <span className="mt-0.5 hidden text-xs md:block">Login</span>
              </Link>
            )}

            <Link to="/cart" className="relative flex flex-col items-center rounded-lg px-2 py-1 text-dark transition-colors hover:bg-gray-50 hover:text-primary">
              <CartIcon />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
              <span className="mt-0.5 hidden text-xs md:block">Cart</span>
            </Link>
          </div>
        </div>

        {!shouldShowSearchBar && <div className="container-main pb-3 sm:hidden" />}
        {shouldShowSearchBar && (
          <div className="container-main pb-3 sm:hidden">
            <form onSubmit={handleSearch} className="flex">
              <div className="relative flex-1">
                <SearchIcon />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search in AHM Mart"
                  className="w-full rounded-l-lg border border-r-0 border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </div>
              <button type="submit" className="rounded-r-lg bg-primary px-4 text-white transition-colors hover:bg-primary-600">
                <SearchButtonIcon />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Category nav */}
      <div className="hidden border-b border-gray-100 bg-white md:block">
        <div className="container-main">
          <nav className="scrollbar-hide flex items-center gap-1 overflow-x-auto py-2">
            <Link
              to="/products"
              className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                isAllCategoriesActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-primary'
              }`}
            >
              All Categories
            </Link>
            {categories.map((cat) => {
              const isActive = activeCategory === cat.slug;
              return (
                <Link
                  key={cat.slug}
                  to={`/products?category=${cat.slug}`}
                  className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-primary'
                  }`}
                >
                  {cat.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;