import React, { useEffect, useState } from 'react';
import { orderService } from '../../services';
import { PAYMENT_METHOD_LABELS } from '../../config/paymentAccounts';

const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrders = () => {
    setLoading(true);
    orderService.getAllOrders()
      .then((res) => setOrders(res.data?.data || []))
      .catch(() => setError('Failed to load orders'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadOrders(); }, []);

  const handleStatusChange = async (id, status) => {
    try {
      await orderService.updateOrderStatus(id, status);
      loadOrders();
    } catch {
      setError('Failed to update order status');
    }
  };

  const handlePaymentApproval = async (id) => {
    try {
      await orderService.updateOrderStatus(id, undefined, 'paid');
      loadOrders();
    } catch {
      setError('Failed to update payment status');
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-dark">Orders</h2>
        <p className="text-gray-500 text-sm">Manage customer orders</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-sm text-sm">{error}</div>
      )}

      <div className="bg-white rounded-sm shadow-card overflow-hidden">
        {loading ? (
          <p className="p-5 text-gray-500">Loading...</p>
        ) : orders.length === 0 ? (
          <p className="p-5 text-gray-500">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Order #</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Payment Method</th>
                  <th className="px-4 py-3 font-medium">Payment Status</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">#{order.display_order_id || order.id}</td>
                    <td className="px-4 py-3">{String(order.userName)}</td>
                    <td className="px-4 py-3 font-semibold">Rs. {Number(order.total_price).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method || '—'}
                    </td>
                    <td className="px-4 py-3 capitalize">
                      <div className="space-y-2">
                        <span>{order.payment_status}</span>
                        {order.payment_method === 'online' && order.payment_status !== 'paid' && (
                          <button
                            type="button"
                            onClick={() => handlePaymentApproval(order.id)}
                            className="block rounded-sm bg-primary px-2 py-1 text-xs font-semibold text-white"
                          >
                            Approve Payment
                          </button>
                        )}
                        {order.payment_method === 'online' && order.payment_status === 'paid' && (
                          <span className="block text-xs text-green-600">Receipt verified</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className="input-field py-1.5 text-xs capitalize"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}
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

export default AdminOrders;
