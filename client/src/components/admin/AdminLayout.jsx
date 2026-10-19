import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingBag, Tags, Banknote, Users, Store, CheckCircle2, Receipt, Undo2,
} from 'lucide-react';
import { useAuthStore } from '../../store';
import { authService } from '../../services';
import PortalBottomNav from '../PortalBottomNav';

// `icon` (emoji) is used by the desktop sidebar as before; `Icon` by the phone bottom bar.
const navItems = [
  { to: '/admin', label: 'Dashboard', end: true, icon: '📊', Icon: LayoutDashboard },
  { to: '/admin/products', label: 'Products', icon: '📦', Icon: Package },
  { to: '/admin/categories', label: 'Categories', icon: '🏷️', Icon: Tags },
  { to: '/admin/sales', label: 'Sales', icon: '💰', Icon: Banknote },
  { to: '/admin/orders', label: 'Orders', icon: '🛒', Icon: ShoppingBag },
  { to: '/admin/users', label: 'Users', icon: '👥', Icon: Users },
  { to: '/admin/sellers', label: 'Sellers', icon: '🏪', Icon: Store },
  { to: '/admin/seller-products', label: 'Product Review', icon: '✅', Icon: CheckCircle2 },
  { to: '/admin/finance', label: 'Seller Finance', icon: '🧾', Icon: Receipt },
  { to: '/admin/returns', label: 'Returns', icon: '↩️', Icon: Undo2 },
];
// Phone bottom bar: the main tabs, everything else under "More".
const PRIMARY = ['/admin', '/admin/products', '/admin/orders'];

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
    <div className="flex min-h-screen max-h-screen flex-col bg-surface md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 flex-col bg-dark text-white md:flex">
        <div className="border-b border-primary-700 p-5">
          <Link to="/" className="block">
            <span className="text-xl font-extrabold">
              <span className="text-primary-300">AHM</span> Mart
            </span>
            <span className="mt-1 block text-xs text-primary-200/70">Admin Panel</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-sm px-4 py-2.5 text-sm font-medium transition-colors ${isActive
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

        <div className="border-t border-primary-700 p-4">
          <p className="mb-3 truncate text-xs text-primary-200/70">{user?.email}</p>
          <Link to="/" className="mb-2 block text-sm text-primary-200 transition-colors hover:text-white">
            ← Back to Store
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full text-left text-sm text-red-300 transition-colors hover:text-red-200"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="border-b border-gray-200 bg-white px-4 py-3 md:px-6 md:py-4">
          <h1 className="text-lg font-bold text-dark md:text-xl">AHM Mart Administration</h1>
        </header>

        {/* pb-20 leaves room for the fixed bottom bar on phones */}
        <main className="flex-1 overflow-auto p-4 pb-20 md:p-6 md:pb-6">
          <Outlet />
        </main>
      </div>

      <PortalBottomNav
        label="Admin navigation"
        primary={navItems.filter((item) => PRIMARY.includes(item.to))}
        more={navItems.filter((item) => !PRIMARY.includes(item.to))}
        moreTitle="Admin Panel"
        email={user?.email}
        onLogout={handleLogout}
      />
    </div>
  );
};

export default AdminLayout;
