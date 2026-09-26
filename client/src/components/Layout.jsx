import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import MinimalHeader from './MinimalHeader';
import Footer from './Footer';
import WhatsAppButton from './WhatsAppButton';

const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

const Layout = () => {
  const location = useLocation();
  const isAuthPage = AUTH_PATHS.some(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
  );

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      {isAuthPage ? <MinimalHeader /> : <Header />}
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Layout;