import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, useCartStore, useWishlistStore } from '../store';
import { authService } from '../services';
import { NAV_CATEGORIES as categories } from '../config/categories';
import { shouldShowBottomNav } from './BottomNav';
import { Heart, LogOut, Package, Search, ShieldCheck, ShoppingCart, User, UserRound, Truck } from 'lucide-react';
import { SHIPPING_TIERS } from '../config/shipping';
import { buildProductPath } from '../utils/product';
import { SuggestionList, optionId, useSearchSuggestions } from './search/SearchSuggestions';

const SearchIcon = () => <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />;
const SearchButtonIcon = () => <Search className="h-4 w-4" aria-hidden="true" />;
const CartIcon = () => <ShoppingCart className="h-6 w-6" strokeWidth={1.6} aria-hidden="true" />;
const UserIcon = () => <User className="h-6 w-6" strokeWidth={1.6} aria-hidden="true" />;

const FREE_SHIPPING_MIN = SHIPPING_TIERS.find((tier) => tier.cost === 0)?.minSubtotal;

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const urlSearch = location.pathname === '/products' ? (params.get('search') || '') : '';

  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);
  const headerRef = useRef(null);

  // Publish the sticky header's height (it differs by breakpoint) so page-level sticky bars can sit right under it.
  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const publish = () => document.documentElement.style.setProperty('--sticky-header-h', `${Math.round(el.getBoundingClientRect().height)}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => { observer.disconnect(); document.documentElement.style.removeProperty('--sticky-header-h'); };
  }, []);
  const { isAuthenticated, user } = useAuthStore();
  const { cart } = useCartStore();
  const wishlistCount = useWishlistStore((state) => state.items.length);
  const [scrolled, setScrolled] = useState(false);

  // A stronger shadow appears once the page has scrolled under the sticky header.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setAccountMenuOpen(false);
    setSuggestOpen(false);
    setActiveIndex(-1);
  }, [location.pathname]);

  useEffect(() => {
    if (!accountMenuOpen) return undefined;

    const handleOutsideClick = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    };

    const handleKey = (event) => { if (event.key === 'Escape') setAccountMenuOpen(false); };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [accountMenuOpen]);
  // On phones the cart lives in the bottom bar; the header shows it only where that bar is hidden.
  const bottomNavVisible = shouldShowBottomNav(location.pathname);
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
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e) => {
    e.preventDefault();
    setSuggestOpen(false);
    setActiveIndex(-1);
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

  const activeCategory = params.get('category') || '';
  const isAllCategoriesActive = !activeCategory;
  const shouldShowSearchBar = !['/help', '/pages'].some((prefix) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`));

  // Type-ahead suggestions (not on /products, where results already update as you type).
  const suggestionsEnabled = shouldShowSearchBar && location.pathname !== '/products';
  const suggest = useSearchSuggestions(searchQuery, suggestionsEnabled && suggestOpen);
  const listVisible = suggestionsEnabled && suggestOpen && suggest.ready;
  const closeSuggest = () => { setSuggestOpen(false); setActiveIndex(-1); };

  const handleSearchKeyDown = (e) => {
    if (!listVisible) return;
    const seeAllIndex = suggest.items.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i >= seeAllIndex ? 0 : i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? seeAllIndex : i - 1));
    } else if (e.key === 'Escape') {
      closeSuggest();
    } else if (e.key === 'Enter' && activeIndex >= 0 && activeIndex < seeAllIndex) {
      e.preventDefault();
      navigate(buildProductPath(suggest.items[activeIndex]));
      closeSuggest();
    }
  };

  const comboProps = (listId) => ({
    role: 'combobox',
    autoComplete: 'off',
    'aria-autocomplete': 'list',
    'aria-expanded': listVisible,
    'aria-controls': listVisible ? listId : undefined,
    'aria-activedescendant': listVisible && activeIndex >= 0 ? optionId(listId, activeIndex) : undefined,
    onFocus: () => setSuggestOpen(true),
    onBlur: closeSuggest,
    onKeyDown: handleSearchKeyDown,
  });

  const renderSuggestions = (listId) => listVisible && (
    <SuggestionList
      listId={listId}
      items={suggest.items}
      loading={suggest.loading}
      query={searchQuery}
      activeIndex={activeIndex}
      onNavigate={closeSuggest}
      onSeeAll={() => handleSearch({ preventDefault() {} })}
    />
  );

  const renderAnnouncement = (className) => (
      <div className={className}>
        <div className="container-main flex items-center justify-between py-1.5 text-[11px] sm:text-xs">
          {FREE_SHIPPING_MIN != null ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">Free delivery on orders of Rs. {FREE_SHIPPING_MIN.toLocaleString('en-PK')} and above</span>
            </span>
          ) : <span />}
          <div className="hidden items-center gap-4 sm:flex">
            <Link to="/help" className="hover:underline">Help Center</Link>
          </div>
        </div>
      </div>
  );

  const renderCategoryNav = (className) => (
      <div className={className}>
        <div className="container-main">
          <nav aria-label="Categories" className="scrollbar-hide flex items-center gap-1 overflow-x-auto py-1.5">
            <Link
              to="/products"
              aria-current={isAllCategoriesActive ? 'page' : undefined}
              className={`inline-flex min-h-[40px] flex-shrink-0 items-center whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition-colors sm:text-sm ${
                isAllCategoriesActive ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-600 hover:bg-primary-50 hover:text-primary-700'
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
                  aria-current={isActive ? 'page' : undefined}
                  className={`inline-flex min-h-[40px] flex-shrink-0 items-center whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition-colors sm:text-sm ${
                    isActive ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-600 hover:bg-primary-50 hover:text-primary-700'
                  }`}
                >
                  {cat.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
  );

  return (
    <>
      {/* Phones: announcement and categories scroll away; only the logo / search row stays sticky,
          so the product is visible sooner. From sm up the whole header stays sticky as before. */}
      {renderAnnouncement('bg-primary-700 text-xs text-white sm:hidden')}
      <header ref={headerRef} className={`sticky top-0 z-50 transition-shadow duration-200 ${scrolled ? 'shadow-soft' : 'shadow-header'}`}>
        {renderAnnouncement('hidden bg-primary-700 text-xs text-white sm:block')}
      {/* Main header row */}
      <div className="border-b border-gray-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
        <div className="container-main flex items-center gap-2 py-2 sm:gap-4 sm:py-3 lg:gap-6">
          <Link
            to="/"
            className="flex-shrink-0"
            aria-label="AHM Mart home"
            // Already on the home page: the route does not change, so scroll to the top ourselves.
            onClick={() => { if (location.pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          >
            {/* Mobile */}
            <div className="flex items-center gap-1.5 sm:hidden">
              <img src="/logo-128.png" alt="" className="h-8 w-8" />
              <span className="whitespace-nowrap text-xl font-extrabold tracking-tight">
                <span className="text-dark">AHM</span>
                <span className="text-primary"> Mart</span>
              </span>
            </div>

            {/* Tablet & Desktop */}
            <div className="hidden items-center gap-2.5 sm:flex">
              <img src="/logo-128.png" alt="" className="h-11 w-11 lg:h-12 lg:w-12" />
              <span className="whitespace-nowrap text-2xl font-extrabold tracking-tight lg:text-[1.7rem]">
                <span className="text-dark">AHM</span>
                <span className="text-primary"> Mart</span>
              </span>
            </div>
          </Link>

          {shouldShowSearchBar && (
            <form onSubmit={handleSearch} role="search" className="hidden max-w-2xl flex-1 sm:mx-auto sm:flex">
              <div className="relative flex-1">
                <SearchIcon />
                <input
                  id="site-search"
                  type="search"
                  enterKeyHint="search"
                  aria-label="Search products"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setActiveIndex(-1); setSuggestOpen(true); }}
                  {...comboProps('site-search-list')}
                  placeholder="Search products, brands and more"
                  className="search-clear-red h-12 w-full rounded-l-2xl border border-r-0 border-gray-200 bg-gray-50 pl-10 pr-3 text-sm shadow-inner transition focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
                {renderSuggestions('site-search-list')}
              </div>
              <button
                type="submit"
                aria-label="Search"
                className="flex h-12 items-center gap-2 rounded-r-2xl bg-primary-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
              >
                <SearchButtonIcon />
                <span className="hidden lg:inline">Search</span>
              </button>
            </form>
          )}

          <div className="ml-auto flex items-center gap-0.5 sm:gap-2">
            <Link
              to="/wishlist"
              aria-label={`Wishlist, ${wishlistCount} items`}
              className="relative hidden min-h-[48px] min-w-[48px] flex-col items-center justify-center rounded-xl px-2 py-1 text-dark transition-colors hover:bg-primary-50 hover:text-primary-700 md:flex"
            >
              <Heart className="h-6 w-6" strokeWidth={1.6} aria-hidden="true" />
              {wishlistCount > 0 && (
                <span className="absolute right-1 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold text-white">
                  {wishlistCount > 9 ? '9+' : wishlistCount}
                </span>
              )}
              <span className="mt-0.5 text-xs">Wishlist</span>
            </Link>
            {isAuthenticated ? (
              <div ref={accountMenuRef} className="relative z-40">
                <button
                  type="button"
                  aria-label="Account menu"
                  aria-haspopup="menu"
                  aria-expanded={accountMenuOpen}
                  onClick={() => setAccountMenuOpen((open) => !open)}
                  className="flex min-h-[48px] min-w-[48px] flex-col items-center justify-center rounded-xl px-2 py-1 text-dark transition-colors hover:bg-primary-50 hover:text-primary-700"
                >
                  <UserIcon />
                  <span className="mt-0.5 hidden max-w-[80px] truncate text-xs md:block">
                    {(user?.firstName || user?.email?.split('@')[0] || 'Account').slice(0, 15)}
                  </span>
                </button>
                <div className={`absolute right-0 top-full z-50 pt-2 ${accountMenuOpen ? 'block' : 'hidden'}`}>
                  <div role="menu" className="min-w-[220px] overflow-hidden rounded-2xl border border-gray-100 bg-white py-1.5 shadow-soft">
                    <div className="border-b border-gray-100 px-4 pb-2.5 pt-2">
                      <p className="truncate text-sm font-bold text-dark">{user?.firstName || user?.name || user?.email?.split('@')[0] || 'Account'}</p>
                      {user?.email && <p className="truncate text-xs text-gray-500">{user.email}</p>}
                    </div>
                    <Link role="menuitem" to="/profile" onClick={() => setAccountMenuOpen(false)} className="flex min-h-[44px] items-center gap-3 px-4 text-sm text-gray-700 transition hover:bg-primary-50 hover:text-primary-700"><UserRound className="h-4 w-4" aria-hidden="true" />My Profile</Link>
                    <Link role="menuitem" to="/orders" onClick={() => setAccountMenuOpen(false)} className="flex min-h-[44px] items-center gap-3 px-4 text-sm text-gray-700 transition hover:bg-primary-50 hover:text-primary-700"><Package className="h-4 w-4" aria-hidden="true" />My Orders</Link>
                    <Link role="menuitem" to="/wishlist" onClick={() => setAccountMenuOpen(false)} className="flex min-h-[44px] items-center gap-3 px-4 text-sm text-gray-700 transition hover:bg-primary-50 hover:text-primary-700"><Heart className="h-4 w-4" aria-hidden="true" />Wishlist</Link>
                    {user?.role === 'Admin' && (
                      <Link role="menuitem" to="/admin" onClick={() => setAccountMenuOpen(false)} className="flex min-h-[44px] items-center gap-3 px-4 text-sm font-semibold text-primary-700 transition hover:bg-primary-50"><ShieldCheck className="h-4 w-4" aria-hidden="true" />Admin Panel</Link>
                    )}
                    <div className="my-1 border-t border-gray-100" />
                    <button
                      type="button"
                      role="menuitem"
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
                      className="flex min-h-[44px] w-full items-center gap-3 px-4 text-left text-sm text-red-600 transition hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link to="/login" aria-label="Login" className="flex min-h-[48px] min-w-[48px] flex-col items-center justify-center rounded-xl px-2 py-1 text-dark transition-colors hover:bg-primary-50 hover:text-primary-700">
                <UserIcon />
                <span className="mt-0.5 hidden text-xs md:block">Login</span>
              </Link>
            )}

            <Link to="/cart" aria-label={`Cart, ${cartCount} items`} className={`${bottomNavVisible ? 'hidden md:flex' : 'flex'} relative min-h-[48px] min-w-[48px] flex-col items-center justify-center rounded-xl px-2 py-1 text-dark transition-colors hover:bg-primary-50 hover:text-primary-700`}>
              <CartIcon />
              {cartCount > 0 && (
                <span className="absolute right-0 top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
              <span className="mt-0.5 hidden text-xs md:block">Cart</span>
            </Link>
          </div>
        </div>

        {!shouldShowSearchBar && <div className="container-main pb-3 sm:hidden" />}
        {shouldShowSearchBar && (
          <div className="container-main pb-2 sm:hidden">
            <form onSubmit={handleSearch} className="flex" role="search">
              <div className="relative flex-1">
                <SearchIcon />
                <input
                  id="site-search-mobile"
                  type="search"
                  enterKeyHint="search"
                  aria-label="Search products"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setActiveIndex(-1); setSuggestOpen(true); }}
                  {...comboProps('site-search-mobile-list')}
                  placeholder="Search in AHM Mart"
                  className="search-clear-red h-11 w-full rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 pl-9 pr-3 text-sm transition focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
                {renderSuggestions('site-search-mobile-list')}
              </div>
              <button type="submit" aria-label="Search" className="rounded-r-xl bg-primary-600 px-4 text-white transition-colors hover:bg-primary-700">
                <SearchButtonIcon />
              </button>
            </form>
          </div>
        )}
      </div>
        {renderCategoryNav('hidden border-b border-gray-100 bg-white sm:block')}
      </header>
      {renderCategoryNav('border-b border-gray-100 bg-white sm:hidden')}
    </>
  );
};

export default Header;