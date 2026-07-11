import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store';

const navItems = [
  { to: '/admin', label: 'Dashboard', end: true, icon: '📊' },
  { to: '/admin/products', label: 'Products', icon: '📦' },
  { to: '/admin/categories', label: 'Categories', icon: '🏷️' },
  { to: '/admin/orders', label: 'Orders', icon: '🛒' },
  { to: '/admin/users', label: 'Users', icon: '👥' },
];

const AdminLayout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

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

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside className={`fixed left-0 top-0 h-full w-64 bg-dark text-white flex flex-col z-50 transform transition-transform duration-300 md:hidden ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 border-b border-primary-700 flex items-center justify-between">
          <Link to="/" onClick={closeMobileMenu} className="block">
            <span className="text-lg font-extrabold">
              <span className="text-primary-300">AHM</span> Mart
            </span>
          </Link>
          <button
            onClick={closeMobileMenu}
            className="text-primary-200 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-sm text-sm font-medium transition-colors ${isActive
                  ? 'bg-primary text-white'
                  : 'text-primary-100 hover:bg-primary-800 hover:text-white'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-primary-700 space-y-3">
          <p className="text-xs text-primary-200/70 truncate">{user?.email}</p>
          <Link
            to="/"
            onClick={closeMobileMenu}
            className="block text-sm text-primary-200 hover:text-white transition-colors"
          >
            ← Back to Store
          </Link>
          <button
            type="button"
            onClick={() => {
              handleLogout();
              closeMobileMenu();
            }}
            className="text-sm text-red-300 hover:text-red-200 transition-colors w-full text-left"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-dark hover:text-primary text-2xl transition-colors"
              >
                ☰
              </button>
              <h1 className="text-lg md:text-xl font-bold text-dark">AHM Mart Administration</h1>
            </div>
            {/* Desktop user info in header */}
            {/* <div className="hidden md:flex items-center gap-4 text-sm">
              <span className="text-gray-600">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="text-red-500 hover:text-red-600 transition-colors font-medium"
              >
                Logout
              </button>
            </div> */}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
