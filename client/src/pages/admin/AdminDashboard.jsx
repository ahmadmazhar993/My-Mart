import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productService, categoryService, orderService, userService } from '../../services';

const StatCard = ({ label, value, icon, to, color }) => (
  <Link
    to={to}
    className="group flex items-center justify-between rounded-xl border border-gray-100 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
  >
    <div>
      <p className="mb-1 text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
    </div>
    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-50 text-2xl transition group-hover:bg-primary-50">
      {icon}
    </span>
  </Link>
);

const STATUS_BADGE_CLASSES = {
  pending: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  confirmed: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
  processing: 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200',
  shipped: 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-200',
  delivered: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  cancelled: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
  default: 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-200',
};

const AdminDashboard = () => {
  const [stats, setStats] = useState({ products: 0, categories: 0, orders: 0, users: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      productService.getAllProducts(),
      categoryService.getAllCategories(),
      orderService.getAllOrders(),
      userService.getAllUsers(),
    ])
      .then(([productsRes, categoriesRes, ordersRes, usersRes]) => {
        const orders = ordersRes.data?.data || [];
        const productsTotal = productsRes.data?.pagination?.total ?? (productsRes.data?.data || []).length;
        const ordersTotal = ordersRes.data?.pagination?.total ?? orders.length;
        const usersTotal = usersRes.data?.pagination?.total ?? (usersRes.data?.data || []).length;

        setStats({
          products: productsTotal,
          categories: (categoriesRes.data?.data || []).length,
          orders: ordersTotal,
          users: usersTotal,
        });
        setRecentOrders(orders.slice(0, 10));
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-gray-500">Loading dashboard...</p>;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-dark">Dashboard</h2>
        <p className="mt-0.5 text-sm text-gray-500">Welcome to AHM Mart admin panel</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Products" value={stats.products} icon="📦" to="/admin/products" color="text-primary" />
        <StatCard label="Categories" value={stats.categories} icon="🏷️" to="/admin/categories" color="text-blue-600" />
        <StatCard label="Orders" value={stats.orders} icon="🛒" to="/admin/orders" color="text-accent-dark" />
        <StatCard label="Users" value={stats.users} icon="👥" to="/admin/users" color="text-purple-600" />
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-dark">Recent Orders</h3>
          <Link to="/admin/orders" className="text-sm font-semibold text-primary hover:underline">
            View all
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p className="text-sm text-gray-500">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="pb-2.5 text-xs font-semibold uppercase tracking-wide">Order #</th>
                  <th className="pb-2.5 text-xs font-semibold uppercase tracking-wide">Status</th>
                  <th className="pb-2.5 text-xs font-semibold uppercase tracking-wide">Payment</th>
                  <th className="pb-2.5 text-xs font-semibold uppercase tracking-wide">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order, idx) => (
                  <tr
                    key={order.id}
                    className={`border-b border-gray-50 transition hover:bg-primary-50/40 ${idx % 2 === 1 ? 'bg-gray-50/40' : ''}`}
                  >
                    <td className="py-3 font-semibold text-gray-900">
                      <Link to={`/orders/${order.id}`} className="text-primary hover:underline">
                        #{order.display_order_id || order.id}
                      </Link>
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_BADGE_CLASSES[order.status?.toLowerCase?.()] || STATUS_BADGE_CLASSES.default}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 capitalize text-gray-600">{order.payment_status}</td>
                    <td className="py-3 font-semibold text-gray-900">Rs. {Number(order.total_price).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;