import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productService, categoryService, orderService, userService } from '../../services';

const StatCard = ({ label, value, icon, to, color }) => (
  <Link
    to={to}
    className="bg-white rounded-sm shadow-card p-5 hover:shadow-card-hover transition-shadow block"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{label}</p>
        <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
      </div>
      <span className="text-3xl">{icon}</span>
    </div>
  </Link>
);

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
        setStats({
          products: (productsRes.data?.data || []).length,
          categories: (categoriesRes.data?.data || []).length,
          orders: orders.length,
          users: (usersRes.data?.data || []).length,
        });
        setRecentOrders(orders.slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-gray-500">Loading dashboard...</p>;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-dark mb-1">Dashboard</h2>
        <p className="text-gray-500 text-sm">Welcome to AHM Mart admin panel</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Products" value={stats.products} icon="📦" to="/admin/products" color="text-primary" />
        <StatCard label="Categories" value={stats.categories} icon="🏷️" to="/admin/categories" color="text-blue-600" />
        <StatCard label="Orders" value={stats.orders} icon="🛒" to="/admin/orders" color="text-accent-dark" />
        <StatCard label="Users" value={stats.users} icon="👥" to="/admin/users" color="text-purple-600" />
      </div>

      <div className="bg-white rounded-sm shadow-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-dark">Recent Orders</h3>
          <Link to="/admin/orders" className="text-primary text-sm font-semibold hover:underline">
            View all
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-gray-500 text-sm">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="pb-2 font-medium">Order #</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Payment</th>
                  <th className="pb-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-50">
                    <td className="py-2.5 font-medium">#{order.display_order_id || order.id}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded-sm bg-primary-50 text-primary text-xs font-semibold capitalize">
                        {order.status}
                      </span>
                    </td>
                    <td className="py-2.5 capitalize text-gray-600">{order.payment_status}</td>
                    <td className="py-2.5 font-semibold">Rs. {Number(order.total_price).toLocaleString()}</td>
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
