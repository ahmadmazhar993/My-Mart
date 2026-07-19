import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { orderService } from '../services';
import { PAYMENT_METHOD_LABELS } from '../config/paymentAccounts';
import { formatPrice } from '../utils/format';
import { useToast } from '../components/ToastProvider';
import { useAuthStore } from '../store';

const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const SellerOrders = () => {
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await orderService.getSellerOrders();
      setOrders(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/login?redirect=/seller/orders" replace />;
  }

  if (user?.role !== 'Seller' && user?.role !== 'seller') {
    return <Navigate to="/profile" replace />;
  }

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    return orders.slice().sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [orders]);

  const handleStatusChange = async (id, status) => {
    setUpdatingId(id);
    try {
      await orderService.updateOrderStatus(id, status);
      addToast('Order status updated.');
      loadOrders();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update order';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="container-main py-6 animate-fade-in">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Seller Orders</p>
          <h1 className="text-2xl font-bold text-dark">Process incoming orders</h1>
          <p className="text-sm text-gray-500">Review, confirm, and ship customer orders from your store.</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-sm border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-5 text-sm text-gray-500">Loading orders...</p>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No orders are assigned to your store yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-dark">#{order.display_order_id || order.id}</p>
                      <p className="text-xs text-gray-500">{order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}</p>
                    </td>
                    <td className="px-4 py-3">{order.userName || order.customer_name || '—'}</td>
                    <td className="px-4 py-3 font-semibold">{formatPrice(order.total_price)}</td>
                    <td className="px-4 py-3">
                      <p className="capitalize">{order.payment_status || '—'}</p>
                      <p className="text-xs text-gray-500">{PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-sm px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-700'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          disabled={updatingId === order.id}
                          className="input-field py-1.5 text-xs capitalize"
                        >
                          {STATUSES.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                        <Link to={`/orders/${order.id}`} className="text-sm font-semibold text-primary hover:underline">
                          Details
                        </Link>
                      </div>
                    </td>
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

export default SellerOrders;
