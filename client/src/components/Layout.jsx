import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import MinimalHeader from './Minimalheader';
import Footer from './Footer';
import WhatsAppButton from './WhatsAppButton';
import BottomNav, { shouldShowBottomNav } from './BottomNav';
import BackButton from './BackButton';

const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

const matches = (pathname, path) => pathname === path || pathname.startsWith(`${path}/`);

const Layout = () => {
  const location = useLocation();
  const { pathname } = location;
  const isAuthPage = AUTH_PATHS.some((path) => matches(pathname, path));
  const showBottomNav = shouldShowBottomNav(pathname);
  // Product pages have a fixed purchase bar on phones. Its space is reserved here, below the footer,
  // so nothing is covered and no blank gap appears above the footer.
  const hasPurchaseBar = pathname.startsWith('/products/') && pathname.length > '/products/'.length;
  const hasSearchResults = pathname === '/products' && Boolean(new URLSearchParams(location.search).get('search'));

  return (
    <div style={hasPurchaseBar || hasSearchResults ? { overflowAnchor: 'none' } : undefined} className={`flex min-h-screen flex-col bg-surface ${showBottomNav ? (matches(pathname, '/cart') ? 'pb-32 md:pb-20 lg:pb-0' : 'pb-14 md:pb-0') : ''}`}>
      <a href="#main-content" className="sr-only z-[100] rounded-xl bg-white px-4 py-3 text-sm font-semibold text-primary-700 shadow-soft focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to main content</a>
      {isAuthPage ? <MinimalHeader /> : <Header />}
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        <BackButton />
        <Outlet />
      </main>
      <Footer reserveBottomBar={hasPurchaseBar} />
      {showBottomNav && <BottomNav />}
      <WhatsAppButton />
    </div>
  );
};

export default Layout;
