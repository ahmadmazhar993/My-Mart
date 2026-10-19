import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { authService } from '../../services';

const navItems = [
  { to: '/admin', label: 'Dashboard', end: true, icon: '📊' },
  { to: '/admin/products', label: 'Products', icon: '📦' },
  { to: '/admin/categories', label: 'Categories', icon: '🏷️' },
  { to: '/admin/sales', label: 'Sales', icon: '💰' },
  { to: '/admin/orders', label: 'Orders', icon: '🛒' },
  { to: '/admin/users', label: 'Users', icon: '👥' },
];

const svg = (path) => (
  <svg className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
    <path d={path} />
  </svg>
);

// Same outline-icon style as the customer bottom bar.
const bottomNavItems = [
  { to: '/admin', label: 'Home', end: true, icon: svg('M3 11l9-8 9 8M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10') },
  { to: '/admin/products', label: 'Products', icon: svg('M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4') },
  { to: '/admin/orders', label: 'Orders', icon: svg('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4') },
  { to: '/admin/sales', label: 'Sales', icon: svg('M3 17l6-6 4 4 8-8M14 7h7v7') },
  { to: '/admin/categories', label: 'Category', icon: svg('M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z') },
  { to: '/admin/users', label: 'Users', icon: svg('M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 3a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75') },
];

const bottomItemClass = (active) =>
  `relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
    active ? 'text-primary' : 'text-gray-500 active:text-primary'
  }`;

const AdminLayout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    (async () => {
      try {
        await authService.logout();
      } catch (err) {
        // ignore
      }
      logout();
      navigate('/login');
    })();
  };


  return (
    <div className="min-h-screen max-h-screen bg-surface flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-dark text-white flex-col flex-shrink-0">
        <div className="p-5 border-b border-primary-700">
          <Link to="/" className="block">
            <span className="text-xl font-extrabold">
              <span className="text-primary-300">AHM</span> Mart
            </span>
            <span className="block text-xs text-primary-200/70 mt-1">Admin Panel</span>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-sm text-sm font-medium transition-colors ${isActive
                  ? 'bg-primary text-white'
                  : 'text-primary-100 hover:bg-primary-800 hover:text-white'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-primary-700">
          <p className="text-xs text-primary-200/70 mb-3 truncate">{user?.email}</p>
          <Link
            to="/"
            className="block text-sm text-primary-200 hover:text-white mb-2 transition-colors"
          >
            ← Back to Store
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-red-300 hover:text-red-200 transition-colors w-full text-left"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white px-4 py-2.5 md:px-6 md:py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-bold text-dark md:text-xl">
              <span className="text-primary md:hidden">AHM</span>
              <span className="md:hidden"> Mart Admin</span>
              <span className="hidden md:inline">AHM Mart Administration</span>
            </h1>
            <div className="flex items-center gap-1 md:hidden">
              <Link
                to="/"
                aria-label="Back to store"
                className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 active:bg-gray-100"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 9l1-5h16l1 5M3 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0M5 12v8h14v-8" />
                </svg>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Logout"
                className="flex h-10 w-10 items-center justify-center rounded-full text-red-500 active:bg-red-50"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 pb-20 md:p-6 md:pb-6 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Admin primary"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white pb-safe shadow-[0_-2px_12px_rgba(0,0,0,0.06)] md:hidden"
      >
        <div className="flex h-14 items-stretch">
          {bottomNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => bottomItemClass(isActive)}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default AdminLayout;
