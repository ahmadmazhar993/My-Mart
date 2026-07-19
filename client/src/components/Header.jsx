import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, useCartStore } from '../store';

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  const { isAuthenticated, user, logout } = useAuthStore();
  const { cart } = useCartStore();

  useEffect(() => {
    setAccountMenuOpen(false);
  }, [location.pathname]);
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
    { name: 'Electronics', slug: 'electronics' },
    { name: 'Fashion', slug: 'clothing' },
    { name: 'Accessories', slug: 'accessories' },
    { name: 'Home & Living', slug: 'home' },
    { name: 'Beauty', slug: 'beauty' },
    { name: 'Sports', slug: 'sports' },
  ];

  const activeCategory = params.get('category') || '';
  const isAllCategoriesActive = !activeCategory;
  const shouldShowSearchBar = !['/help', '/pages'].some((prefix) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`));

  return (
    <header className="sticky top-0 z-50 shadow-header">
      <div className="bg-primary text-white text-xs">
        <div className="container-main flex items-center justify-between py-1.5">
          <span>Free shipping on orders over Rs. 2,000</span>
          <div className="hidden sm:flex items-center gap-4">
            <Link to="/pages/sell" className="hover:underline">Sell on AHM Mart</Link>
            <span className="opacity-60">|</span>
            <Link to="/help" className="hover:underline">Help Center</Link>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-100">
        <div className="container-main flex items-center gap-4 lg:gap-8 py-3">
          <Link to="/" className="flex-shrink-0">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              <span className="text-primary">AHM</span>
              <span className="text-dark"> Mart</span>
            </span>
          </Link>

          {shouldShowSearchBar && (
            <form onSubmit={handleSearch} className="flex-1 max-w-2xl hidden sm:flex">
              <div className="flex w-full border-2 border-primary rounded-sm overflow-hidden">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search in AHM Mart"
                  className="flex-1 px-4 py-2 text-sm focus:outline-none"
                />
                <button
                  type="submit"
                  className="bg-primary text-white px-5 flex items-center hover:bg-primary-600 transition-colors"
                >
                  <SearchIcon />
                </button>
              </div>
            </form>
          )}

          <div className="flex items-center gap-1 sm:gap-4 ml-auto">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((open) => !open)}
                  className="flex flex-col items-center px-2 py-1 text-dark hover:text-primary transition-colors"
                >
                  <UserIcon />
                  <span className="text-xs mt-0.5 hidden md:block max-w-[80px] truncate">
                    {(user?.firstName || user?.email?.split('@')[0] || 'Account').slice(0, 15)}
                  </span>
                </button>
                <div className={`absolute right-0 top-full pt-1 ${accountMenuOpen ? 'block' : 'hidden'}`}>
                  <div className="bg-white border border-gray-200 rounded-sm shadow-lg py-1 min-w-[160px]">
                    <Link to="/profile" onClick={() => setAccountMenuOpen(false)} className="block px-4 py-2 text-sm hover:bg-gray-50">My Profile</Link>
                    <Link to="/orders" onClick={() => setAccountMenuOpen(false)} className="block px-4 py-2 text-sm hover:bg-gray-50">My Orders</Link>
                    <Link to="/wishlist" onClick={() => setAccountMenuOpen(false)} className="block px-4 py-2 text-sm hover:bg-gray-50">Wishlist</Link>
                    {user?.role === 'Admin' && (
                      <Link to="/admin" onClick={() => setAccountMenuOpen(false)} className="block px-4 py-2 text-sm hover:bg-gray-50 text-primary font-semibold">Admin Panel</Link>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setAccountMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-red-600"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link to="/login" className="flex flex-col items-center px-2 py-1 text-dark hover:text-primary transition-colors">
                <UserIcon />
                <span className="text-xs mt-0.5 hidden md:block">Login</span>
              </Link>
            )}

            <Link to="/cart" className="flex flex-col items-center px-2 py-1 text-dark hover:text-primary transition-colors relative">
              <CartIcon />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 right-0 bg-primary text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
              <span className="text-xs mt-0.5 hidden md:block">Cart</span>
            </Link>
          </div>
        </div>

        {!shouldShowSearchBar && <div className="container-main pb-3 sm:hidden" />}
        {shouldShowSearchBar && (
          <div className="container-main pb-3 sm:hidden">
            <form onSubmit={handleSearch}>
              <div className="flex border-2 border-primary rounded-sm overflow-hidden">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search in AHM Mart"
                  className="flex-1 px-3 py-2 text-sm focus:outline-none"
                />
                <button type="submit" className="bg-primary text-white px-4">
                  <SearchIcon />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <div className="bg-white border-b border-gray-100 hidden md:block">
        <div className="container-main">
          <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-2">
            <Link
              to="/products"
              className={`flex-shrink-0 px-4 py-1.5 text-sm rounded-sm transition-colors ${isAllCategoriesActive ? 'font-semibold text-primary bg-primary-50' : 'text-gray-600 hover:text-primary hover:bg-primary-50'}`}
            >
              All Categories
            </Link>
            {categories.map((cat) => {
              const isActive = activeCategory === cat.slug;
              return (
                <Link
                  key={cat.slug}
                  to={`/products?category=${cat.slug}`}
                  className={`flex-shrink-0 px-4 py-1.5 text-sm rounded-sm transition-colors ${isActive ? 'font-semibold text-primary bg-primary-50' : 'text-gray-600 hover:text-primary hover:bg-primary-50'}`}
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
