import React, { useEffect, useState } from 'react';
import { orderService } from '../../services';
import { PAYMENT_METHOD_LABELS } from '../../config/paymentAccounts';

const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

const statusClasses = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-indigo-100 text-indigo-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
};

const paymentStatusClasses = {
  pending: 'bg-slate-100 text-slate-700',
  paid: 'bg-emerald-100 text-emerald-700',
  unpaid: 'bg-amber-100 text-amber-700',
  failed: 'bg-rose-100 text-rose-700',
  refunded: 'bg-violet-100 text-violet-700',
};

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

  const getProductNames = (order) => {
    const fromProductName = order?.product_name;
    if (typeof fromProductName === 'string' && fromProductName.trim()) {
      return fromProductName;
    }

    const fromProductNames = order?.product_names;
    if (typeof fromProductNames === 'string' && fromProductNames.trim()) {
      return fromProductNames;
    }

    const productItems = Array.isArray(order?.products)
      ? order.products
      : Array.isArray(order?.items)
        ? order.items
        : [];

    const names = productItems
      .map((item) => item?.product_name || item?.name || item?.product?.name || item?.product?.product_name)
      .filter(Boolean);

    return names.length ? names.join(', ') : '—';
  };

  const broadcastOrderUpdate = () => {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('orders-updates');
      channel.postMessage({ type: 'orders-updated' });
      channel.close();
    }

    localStorage.setItem('orders:updated', String(Date.now()));
    window.dispatchEvent(new Event('orders:updated'));
  };

  const handleStatusChange = async (id, status) => {
    try {
      await orderService.updateOrderStatus(id, status);
      broadcastOrderUpdate();
      loadOrders();
    } catch {
      setError('Failed to update order status');
    }
  };

  const handlePaymentApproval = async (id) => {
    try {
      await orderService.updateOrderStatus(id, undefined, 'paid');
      broadcastOrderUpdate();
      loadOrders();
    } catch {
      setError('Failed to update payment status');
    }
  };

  const renderBadge = (value, type) => {
    const classes = type === 'status'
      ? statusClasses[value?.toLowerCase?.() || 'pending'] || statusClasses.pending
      : paymentStatusClasses[value?.toLowerCase?.() || 'pending'] || paymentStatusClasses.pending;

    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${classes}`}>
        {value || 'pending'}
      </span>
    );
  };

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark">Orders</h2>
          <p className="text-sm text-gray-500">Manage customer orders</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading...</div>
        ) : orders.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No orders yet.</div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50/95 text-left text-gray-600 backdrop-blur">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Order #</th>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 font-semibold">Product Name</th>
                    <th className="px-4 py-3 font-semibold">Total</th>
                    <th className="px-4 py-3 font-semibold">Payment Method</th>
                    <th className="px-4 py-3 font-semibold">Payment Status</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {orders.map((order) => {
                    const productNames = getProductNames(order);
                    const isOnlinePendingPayment = order.payment_method === 'online' && order.payment_status !== 'paid';

                    return (
                      <tr key={order.id} className="align-top transition-colors hover:bg-gray-50/80">
                        <td className="px-4 py-3 font-semibold text-gray-900">#{order.display_order_id || order.id}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{String(order.userName || '—')}</span>
                            <span className="text-xs text-gray-500">{order.userEmail || ''}</span>
                          </div>
                        </td>
                        <td className="max-w-[240px] px-4 py-3">
                          <div className="truncate" title={productNames}>{productNames}</div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">Rs. {Number(order.total_price).toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-2">
                            {renderBadge(order.payment_status, 'payment')}
                            {isOnlinePendingPayment && (
                              <button
                                type="button"
                                onClick={() => handlePaymentApproval(order.id)}
                                className="w-fit rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-primary-600"
                              >
                                Approve Payment
                              </button>
                            )}
                            {order.payment_method === 'online' && order.payment_status === 'paid' && (
                              <span className="text-xs font-medium text-emerald-600">Receipt verified</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            className="w-full min-w-[120px] rounded-md border border-gray-300 bg-white px-2.5 py-2 text-sm font-medium capitalize text-gray-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                          {order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-3 md:hidden">
              {orders.map((order) => {
                const productNames = getProductNames(order);
                const isOnlinePendingPayment = order.payment_method === 'online' && order.payment_status !== 'paid';

                return (
                  <div key={order.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">#{order.display_order_id || order.id}</p>
                        <p className="text-sm text-gray-700">{String(order.userName || '—')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">Rs. {Number(order.total_price).toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}</p>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Product</span>
                        <span className="max-w-[60%] truncate text-sm text-gray-700" title={productNames}>{productNames}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Payment</span>
                        <span className="text-sm text-gray-700">
                          {PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method || '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Status</span>
                        {renderBadge(order.payment_status, 'payment')}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-col gap-2">
                      {isOnlinePendingPayment && (
                        <button
                          type="button"
                          onClick={() => handlePaymentApproval(order.id)}
                          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
                        >
                          Approve Payment
                        </button>
                      )}
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium capitalize text-gray-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;
