import React from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { LayoutDashboard, Package, Boxes, ShoppingBag, Settings, LogOut, Store, Wallet, BarChart3, Undo2 } from 'lucide-react';
import { useAuthStore } from '../../store';
import { authService } from '../../services';
import PortalBottomNav from '../PortalBottomNav';

const navItems = [
  { to: '/seller/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/seller/products', label: 'Products', Icon: Package },
  { to: '/seller/inventory', label: 'Inventory', Icon: Boxes },
  { to: '/seller/orders', label: 'Orders', Icon: ShoppingBag },
  { to: '/seller/returns', label: 'Returns', Icon: Undo2 },
  { to: '/seller/earnings', label: 'Earnings', Icon: Wallet },
  { to: '/seller/analytics', label: 'Analytics', Icon: BarChart3 },
  { to: '/seller/store-settings', label: 'Store settings', Icon: Settings },
];
// Phone bottom bar: the most-used tabs, everything else under "More".
const PRIMARY = ['/seller/dashboard', '/seller/products', '/seller/orders'];

const titleFor = (pathname) => {
  if (pathname.startsWith('/seller/products/new')) return 'New product';
  if (pathname.includes('/edit')) return 'Edit product';
  const match = navItems.find((item) => pathname.startsWith(item.to));
  return match ? match.label : 'Seller dashboard';
};

const SellerLayout = () => {
  const ctx = useOutletContext();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try { await authService.logout(); } catch { /* clear local state regardless */ }
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="sticky top-0 hidden h-screen w-64 flex-shrink-0 flex-col bg-dark text-white md:flex">
        <div className="border-b border-primary-700 p-5">
          <Link to="/" className="block">
            <span className="text-xl font-extrabold"><span className="text-primary-300">AHM</span> Mart</span>
            <span className="mt-1 block text-xs text-primary-200/70">Seller Centre</span>
          </Link>
        </div>
        <nav aria-label="Seller navigation" className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `flex min-h-[44px] items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 ${isActive ? 'bg-primary text-white' : 'text-primary-100 hover:bg-primary-800 hover:text-white'}`}
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-3 border-t border-primary-700 p-4">
          <p className="truncate text-xs text-primary-200/70">{user?.email}</p>
          <Link to="/" className="block text-sm text-primary-200 transition-colors hover:text-white">← Back to store</Link>
          <button type="button" onClick={handleLogout} className="flex min-h-[44px] w-full items-center gap-2 text-left text-sm text-red-300 transition-colors hover:text-red-200">
            <LogOut size={16} aria-hidden="true" /> Logout
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white px-4 py-3 md:px-6">
          <div className="flex items-center justify-between gap-3">
            <h1 className="truncate text-lg font-bold text-dark md:text-xl">{titleFor(location.pathname)}</h1>
            <div className="flex min-w-0 items-center gap-2 text-sm text-gray-600">
              <Store size={16} aria-hidden="true" className="flex-shrink-0 text-primary" />
              <span className="max-w-[45vw] truncate font-medium sm:max-w-xs">{ctx?.seller?.shop_name}</span>
            </div>
          </div>
        </header>
        {/* pb-20 leaves room for the fixed bottom bar on phones */}
        <main className="min-w-0 flex-1 p-4 pb-20 md:p-6 md:pb-6">
          <div className="mx-auto w-full max-w-[1400px]">
            <Outlet context={ctx} />
          </div>
        </main>
      </div>

      <PortalBottomNav
        label="Seller navigation"
        primary={navItems.filter((item) => PRIMARY.includes(item.to))}
        more={navItems.filter((item) => !PRIMARY.includes(item.to))}
        moreTitle="Seller Centre"
        email={user?.email}
        onLogout={handleLogout}
      />
    </div>
  );
};

export default SellerLayout;
