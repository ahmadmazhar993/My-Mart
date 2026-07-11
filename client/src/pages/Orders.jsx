import React, { useState, useEffect } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Breadcrumb, EmptyState, ProductSkeleton } from '../components/ui';
import { ONLINE_PAYMENT_ACCOUNTS, PAYMENT_METHOD_LABELS } from '../config/paymentAccounts';
import { orderService } from '../services';
import { useAuthStore } from '../store';
import { formatPrice } from '../utils/format';

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const PAYMENT_STYLES = {
  unpaid: 'text-orange-600',
  paid: 'text-green-600',
  refunded: 'text-gray-500',
};

const PAYMENT_BADGE_STYLES = {
  unpaid: 'bg-amber-100 text-amber-800',
  paid: 'bg-green-100 text-green-800',
  refunded: 'bg-gray-100 text-gray-700',
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const Orders = () => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(location.state?.orderPlaced || false);
  const [uploadingId, setUploadingId] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const placedPaymentMethod = location.state?.paymentMethod;

  useEffect(() => {
    if (!isAuthenticated) return;

    setLoading(true);
    orderService.getAllOrders()
      .then((res) => {
        const all = res.data?.data || [];
        setOrders(all);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated, user?.id]);

  const handleReceiptUpload = async (orderId, file) => {
    if (!file) return;
    setUploadingId(orderId);
    setUploadMessage('');
    const formData = new FormData();
    formData.append('receipt', file);
    try {
      await orderService.submitPaymentProof(orderId, formData);
      setUploadMessage('Payment proof uploaded successfully.');
      orderService.getAllOrders().then((res) => setOrders(res.data?.data || []));
    } catch {
      setUploadMessage('Failed to upload payment proof. Please try again.');
    } finally {
      setUploadingId(null);
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="container-main py-6 animate-fade-in">
      <Breadcrumb items={[
        { label: 'Home', to: '/' },
        { label: 'My Account', to: '/profile' },
        { label: 'My Orders' },
      ]} />

      <h1 className="text-xl font-bold text-dark mb-6">My Orders</h1>

      {showSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-sm mb-4 text-sm">
          <div className="flex justify-between items-start gap-4">
            <div>
              <p className="font-semibold">Your order has been placed successfully!</p>
              {placedPaymentMethod === 'online' && (
                <div className="mt-3 space-y-2 text-green-900">
                  <p>Please complete your payment using one of the accounts below and include your order number in the reference.</p>
                  {ONLINE_PAYMENT_ACCOUNTS.map((account) => (
                    <div key={`${account.type}-${account.account}`}>
                      <p className="font-semibold">{account.type}:</p>
                      {account.provider && account.type === 'Bank' && <p>{account.provider}</p>}
                      <p>{account.account}</p>
                      <p>{account.accountHolder}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button type="button" onClick={() => setShowSuccess(false)} className="text-green-600 font-bold">×</button>
          </div>
        </div>
      )}

      {loading ? (
        <ProductSkeleton count={3} />
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-sm shadow-card">
          <EmptyState
            icon="📦"
            title="No orders yet"
            description="When you place an order, it will appear here."
            action={<Link to="/products" className="btn-primary">Start Shopping</Link>}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-sm shadow-card overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 bg-gray-50 border-b">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                  <span>
                    <span className="text-gray-500">Order #</span>{' '}
                    <span className="font-semibold">{order.display_order_id || order.id}</span>
                  </span>
                  <span>
                    <span className="text-gray-500">Placed on</span>{' '}
                    <span className="font-medium">{formatDate(order.created_at)}</span>
                  </span>
                  <span>
                    <span className="text-gray-500">Total</span>{' '}
                    <span className="font-bold text-primary">{formatPrice(order.total_price)}</span>
                  </span>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-sm capitalize ${STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-700'}`}>
                  {order.status}
                </span>
              </div>

              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">Shipping Address</p>
                  <p className="font-medium">{order.shipping_address || '—'}</p>
                  <Link to={`/orders/${order.id}`} className="mt-2 inline-flex text-sm font-semibold text-primary hover:underline">
                    View details
                  </Link>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Payment Method</span>
                    <span className="font-semibold">
                      {PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Payment Status</span>
                    <span className={`font-semibold capitalize ${PAYMENT_STYLES[order.payment_status] || ''}`}>
                      {order.payment_status}
                    </span>
                  </div>
                  {order.shipping_cost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Shipping</span>
                      <span>{formatPrice(order.shipping_cost)}</span>
                    </div>
                  )}
                  {order.tracking_number && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tracking</span>
                      <span className="font-medium text-primary">{order.tracking_number}</span>
                    </div>
                  )}
                </div>
              </div>

              {order.payment_method === 'online' && (
                <div className="px-5 pb-5">
                  <div className={`rounded-sm border p-4 text-sm ${order.payment_status === 'paid' ? 'bg-green-50 border-green-200 text-green-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold">Payment status</p>
                        <p className="mt-1">{order.payment_status === 'paid' ? 'Payment verified. Your order is being processed.' : 'Awaiting payment verification.'}</p>
                      </div>
                      <span className={`inline-flex w-fit rounded-sm px-2.5 py-1 text-xs font-semibold capitalize ${PAYMENT_BADGE_STYLES[order.payment_status] || 'bg-gray-100 text-gray-700'}`}>
                        {order.payment_status}
                      </span>
                    </div>
                    {order.payment_status !== 'paid' && (
                      <div className="mt-4 space-y-3">
                        <p>
                          Transfer {formatPrice(order.total_price)} using one of the accounts below and include order #{order.display_order_id || order.id} in the reference.
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {ONLINE_PAYMENT_ACCOUNTS.map((account) => (
                            <div key={`${account.type}-${account.account}`} className="rounded-sm border border-amber-200 bg-white/80 p-3">
                              <p className="font-semibold">{account.type}</p>
                              {account.provider && account.type === 'Bank' && <p>{account.provider}</p>}
                              <p>{account.account}</p>
                              <p>{account.accountHolder}</p>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-sm border border-amber-200 bg-white/80 p-3">
                          <label className="mb-2 block text-sm font-semibold">Upload payment receipt</label>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => handleReceiptUpload(order.id, e.target.files?.[0])}
                            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-sm file:border-0 file:bg-primary file:px-3 file:py-2 file:text-white"
                          />
                          <p className="mt-2 text-xs text-gray-500">PNG, JPG, or PDF up to 5MB.</p>
                        </div>
                        {uploadingId === order.id && <p className="text-sm">Uploading...</p>}
                        {uploadMessage && <p className="text-sm">{uploadMessage}</p>}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
