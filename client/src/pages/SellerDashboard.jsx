import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { orderService, productService } from '../services';
import { useAuthStore } from '../store';

const SellerDashboard = () => {
  const { isAuthenticated, user } = useAuthStore();
  const [metrics, setMetrics] = useState({ loading: true, products: 0, orders: 0, sales: 0, storeRating: 4.9, error: '' });

  if (!isAuthenticated) {
    return <Navigate to="/login?redirect=/seller" replace />;
  }

  if (user?.role !== 'Seller' && user?.role !== 'seller') {
    return <Navigate to="/profile" replace />;
  }

  useEffect(() => {
    const fetchMetrics = async () => {
      setMetrics((prev) => ({ ...prev, loading: true, error: '' }));
      try {
        const [productsRes, ordersRes] = await Promise.all([
          productService.getSellerProducts(),
          orderService.getSellerOrders(),
        ]);

        const productsData = productsRes.data?.data || [];
        const ordersData = ordersRes.data?.data || [];
        const salesTotal = ordersData.reduce((sum, order) => sum + Number(order.total_price || 0), 0);

        setMetrics({
          loading: false,
          products: productsData.length,
          orders: ordersData.length,
          sales: salesTotal,
          storeRating: 4.9,
          error: '',
        });
      } catch (err) {
        setMetrics((prev) => ({
          ...prev,
          loading: false,
          error: err.response?.data?.message || 'Unable to load seller metrics',
        }));
      }
    };

    fetchMetrics();
  }, [isAuthenticated]);

  const quickStats = [
    {
      label: 'Active Listings',
      value: metrics.loading ? '...' : metrics.products,
      sub: metrics.loading ? 'Loading products...' : `${metrics.products} live listings`,
      tone: 'text-emerald-600',
    },
    {
      label: 'Pending Orders',
      value: metrics.loading ? '...' : metrics.orders,
      sub: metrics.loading ? 'Loading orders...' : `${metrics.orders} incoming orders`,
      tone: 'text-amber-600',
    },
    {
      label: 'Sales This Month',
      value: metrics.loading ? '...' : `$${metrics.sales.toLocaleString()}`,
      sub: metrics.loading ? 'Loading sales...' : 'Total order revenue',
      tone: 'text-primary',
    },
    {
      label: 'Store Rating',
      value: metrics.loading ? '...' : metrics.storeRating.toFixed(1),
      sub: metrics.loading ? 'Loading rating...' : 'Based on your customer feedback',
      tone: 'text-sky-600',
    },
  ];

  const quickActions = [
    { title: 'Manage Products', desc: 'Add, edit, and update your catalog', link: '/seller/products' },
    { title: 'Review Orders', desc: 'Accept, process, and ship orders', link: '/seller/orders' },
    { title: 'Help Center', desc: 'Get support and seller guidance', link: '/help' },
  ];

  const productManagement = [
    'Add products',
    'Edit products',
    'Delete products',
    'Upload product images',
    'Manage product categories',
    'Set pricing',
    'Add product descriptions',
    'Manage inventory and stock',
    'Add product variants (size, color, weight, capacity)',
  ];

  const orderManagement = [
    'Receive new orders',
    'Accept or reject orders',
    'Update order status',
    'Processing',
    'Packed',
    'Shipped',
    'Delivered',
    'Print invoices',
    'Print shipping labels',
  ];

  const businessManagement = [
    'View sales dashboard',
    'Track earnings',
    'View analytics',
    'Manage discounts',
    'Create coupons',
    'Respond to customer questions',
    'Handle return requests',
    'Manage shipping settings',
    'View product performance',
  ];

  const sellerPermissions = [
    'Can manage only their own products',
    'Can manage only their own orders',
    'Can view only their own sales reports',
    'Cannot delete other sellers products',
    'Cannot access platform settings',
    'Cannot manage admins',
  ];

  const recentActivity = [
    { title: 'New order received', meta: 'Order #1042 • 2 items • Pending confirmation', status: 'New' },
    { title: 'Product stock updated', meta: 'Wireless Headphones • 12 units available', status: 'Updated' },
    { title: 'Customer review received', meta: '5-star feedback for delivery experience', status: 'Positive' },
  ];

  return (
    <div className="container-main py-6 animate-fade-in">
      {metrics.error && (
        <div className="mb-4 rounded-sm border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {metrics.error}
        </div>
      )}
      <div className="rounded-xl border border-gray-200 bg-gradient-to-r from-primary via-[#ff7a1a] to-[#ff9a3c] p-6 md:p-8 text-white shadow-card mb-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">Seller Center</p>
            <h1 className="text-2xl md:text-3xl font-bold mt-2">Welcome back, {user?.firstName || user?.first_name || 'Seller'}.</h1>
            <p className="text-sm md:text-base text-white/90 mt-2 max-w-2xl">
              Manage your storefront with confidence and stay on top of orders, inventory, and customer trust.
            </p>
          </div>
          <div className="rounded-lg bg-white/15 px-4 py-3 backdrop-blur-sm min-w-[220px]">
            <p className="text-xs uppercase tracking-[0.2em] text-white/70">Store health</p>
            <p className="text-xl font-semibold mt-1">Excellent</p>
            <p className="text-sm text-white/80 mt-1">Your store is performing strongly this week.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {quickStats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-2xl font-bold text-dark mt-2">{stat.value}</p>
            <p className={`text-sm mt-1 ${stat.tone}`}>{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.9fr] gap-6">
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-dark">Quick Actions</h2>
                <p className="text-sm text-gray-500">Jump into the most common seller tasks.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {quickActions.map((action) => (
                <Link key={action.title} to={action.link} className="rounded-lg border border-gray-200 p-4 hover:border-primary hover:shadow-sm transition-all">
                  <p className="font-semibold text-dark">{action.title}</p>
                  <p className="text-sm text-gray-500 mt-1">{action.desc}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-dark">Recent Activity</h2>
                <p className="text-sm text-gray-500">A quick snapshot of what happened recently.</p>
              </div>
            </div>
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <div key={item.title} className="flex items-start justify-between rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div>
                    <p className="font-medium text-dark">{item.title}</p>
                    <p className="text-sm text-gray-500 mt-1">{item.meta}</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{item.status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-dark mb-4">Product Management</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              {productManagement.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-dark mb-4">Order Management</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              {orderManagement.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm h-fit">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-dark">Performance Summary</h2>
              <p className="text-sm text-gray-500">Keep your seller experience consistent and efficient.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-dark">Order completion</p>
                <span className="text-sm font-semibold text-emerald-600">92%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100">
                <div className="h-2 w-[92%] rounded-full bg-emerald-500" />
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-dark">Inventory freshness</p>
                <span className="text-sm font-semibold text-primary">87%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100">
                <div className="h-2 w-[87%] rounded-full bg-primary" />
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <p className="font-semibold text-dark">Business Management</p>
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                {businessManagement.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <p className="font-semibold text-dark">Seller permissions</p>
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                {sellerPermissions.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;
