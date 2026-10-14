import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import MinimalHeader from './Minimalheader';
import Footer from './Footer';
import WhatsAppButton from './WhatsAppButton';
import BottomNav, { shouldShowBottomNav } from './BottomNav';

const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

const matches = (pathname, path) => pathname === path || pathname.startsWith(`${path}/`);

const Layout = () => {
  const location = useLocation();
  const { pathname } = location;
  const isAuthPage = AUTH_PATHS.some((path) => matches(pathname, path));
  const showBottomNav = shouldShowBottomNav(pathname);

  return (
    <div className={`flex min-h-screen flex-col bg-surface ${showBottomNav ? (matches(pathname, '/cart') ? 'pb-32 md:pb-20 lg:pb-0' : 'pb-14 md:pb-0') : ''}`}>
      {isAuthPage ? <MinimalHeader /> : <Header />}
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      {showBottomNav && <BottomNav />}
      <WhatsAppButton />
    </div>
  );
};

export default Layout;
