import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Breadcrumb, EmptyState, ProductSkeleton } from '../components/ui';
import { ONLINE_PAYMENT_ACCOUNTS, PAYMENT_METHOD_LABELS } from '../config/paymentAccounts';
import { orderService } from '../services';
import { useAuthStore } from '../store';
import { useToast } from '../components/ToastProvider';
import { API_BASE, API_VERSION } from '../services/api';
import { formatPrice } from '../utils/format';
import { validatePaymentReceiptFile } from '../utils/paymentValidation';

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  confirmed: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
  processing: 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200',
  shipped: 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-200',
  delivered: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  cancelled: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
};

const PAYMENT_STYLES = {
  unpaid: 'text-amber-600',
  paid: 'text-emerald-600',
  refunded: 'text-gray-500',
};

const PAYMENT_BADGE_STYLES = {
  unpaid: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  paid: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  refunded: 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-200',
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
  const { addToast } = useToast();
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(location.state?.orderPlaced || false);
  const [uploadingId, setUploadingId] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const placedPaymentMethod = location.state?.paymentMethod;

  const loadOrders = useCallback(async (showToast = false) => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const res = await orderService.getAllOrders();
      const nextOrders = res.data?.data || [];
      setOrders((prevOrders) => {
        if (showToast && prevOrders.length && JSON.stringify(prevOrders) !== JSON.stringify(nextOrders)) {
          addToast('Your order status has been updated.', 'success');
        }
        return nextOrders;
      });
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id, addToast]);

  useEffect(() => {
    loadOrders();
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const eventSourceUrl = (() => {
      const url = new URL(`${API_VERSION}/orders/events`, API_BASE);
      const token = localStorage.getItem('token');
      if (token) {
        url.searchParams.set('token', token);
      }
      return url.toString();
    })();

    const eventSource = new EventSource(eventSourceUrl);
    eventSource.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === 'orders-updated') {
        loadOrders(true);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [isAuthenticated, loadOrders]);

  const handleReceiptUpload = async (orderId, file) => {
    if (!file) return;

    const receiptError = validatePaymentReceiptFile(file);
    if (receiptError) {
      setUploadMessage(receiptError);
      return;
    }

    setUploadingId(orderId);
    setUploadMessage('');
    const formData = new FormData();
    formData.append('receipt', file);
    try {
      await orderService.submitPaymentProof(orderId, formData);
      setUploadMessage('Payment proof uploaded successfully.');
      window.dispatchEvent(new Event('orders:updated'));
      await loadOrders();
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
    <div className="container-main animate-fade-in py-6">
      <Breadcrumb items={[
        { label: 'Home', to: '/' },
        { label: 'My Account', to: '/profile' },
        { label: 'My Orders' },
      ]} />

      <h1 className="mb-6 text-xl font-bold tracking-tight text-dark">My Orders</h1>

      {showSuccess && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-1.5 font-semibold">
                <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Your order has been placed successfully!
              </p>
              {placedPaymentMethod === 'online' && (
                <div className="mt-3 space-y-2 text-emerald-900">
                  <p>Please complete your payment using one of the accounts below and include your order number in the reference.</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {ONLINE_PAYMENT_ACCOUNTS.map((account) => (
                      <div key={`${account.type}-${account.account}`} className="rounded-lg border border-emerald-200 bg-white/70 p-3">
                        <p className="font-semibold">{account.type}</p>
                        {account.provider && account.type === 'Bank' && <p>{account.provider}</p>}
                        <p>{account.account}</p>
                        <p>{account.accountHolder}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowSuccess(false)}
              aria-label="Dismiss"
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-emerald-600 transition hover:bg-emerald-100"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <ProductSkeleton count={3} />
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white shadow-card">
          <EmptyState
            icon="📦"
            title="No orders yet"
            description="When you place an order, it will appear here."
            action={
              <Link
                to="/products"
                className="inline-flex items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600"
              >
                Start Shopping
              </Link>
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-card">
              <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                  <span>
                    <span className="text-gray-500">Order #</span>{' '}
                    <span className="font-semibold text-gray-900">{order.display_order_id || order.id}</span>
                  </span>
                  <span>
                    <span className="text-gray-500">Placed on</span>{' '}
                    <span className="font-medium text-gray-700">{formatDate(order.created_at)}</span>
                  </span>
                  <span>
                    <span className="text-gray-500">Total</span>{' '}
                    <span className="font-bold text-primary">{formatPrice(order.total_price)}</span>
                  </span>
                </div>
                <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[order.status] || 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-200'}`}>
                  {order.status}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 p-5 text-sm sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-gray-500">Shipping Address</p>
                  <p className="font-medium text-gray-800">{order.shipping_address || '—'}</p>
                  <Link
                    to={`/orders/${order.id}`}
                    className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary transition hover:underline"
                  >
                    View details
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Payment Method</span>
                    <span className="font-semibold text-gray-800">
                      {PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Payment Status</span>
                    <span className={`font-semibold capitalize ${PAYMENT_STYLES[order.payment_status] || 'text-gray-700'}`}>
                      {order.payment_status}
                    </span>
                  </div>
                  {order.shipping_cost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Shipping</span>
                      <span className="text-gray-800">{formatPrice(order.shipping_cost)}</span>
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
                  <div
                    className={`rounded-xl border p-4 text-sm ${
                      order.payment_status === 'paid'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : 'border-amber-200 bg-amber-50 text-amber-900'
                    }`}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold">Payment status</p>
                        <p className="mt-1">
                          {order.payment_status === 'paid'
                            ? 'Payment verified. Your order is being processed.'
                            : 'Awaiting payment verification.'}
                        </p>
                      </div>
                      <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${PAYMENT_BADGE_STYLES[order.payment_status] || 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-200'}`}>
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
                            <div key={`${account.type}-${account.account}`} className="rounded-lg border border-amber-200 bg-white/80 p-3">
                              <p className="font-semibold">{account.type}</p>
                              {account.provider && account.type === 'Bank' && <p>{account.provider}</p>}
                              <p>{account.account}</p>
                              <p>{account.accountHolder}</p>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-lg border border-amber-200 bg-white/80 p-3">
                          <label className="mb-2 block text-sm font-semibold">Upload payment receipt</label>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => handleReceiptUpload(order.id, e.target.files?.[0])}
                            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3.5 file:py-2 file:text-sm file:font-semibold file:text-white file:transition hover:file:bg-primary-600"
                          />
                          <p className="mt-2 text-xs text-gray-500">PNG, JPG, or PDF up to 5MB.</p>
                          {uploadingId === order.id && (
                            <p className="mt-2 flex items-center gap-2 text-sm text-amber-800">
                              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-300 border-t-amber-700" />
                              Uploading...
                            </p>
                          )}
                          {uploadMessage && <p className="mt-2 text-sm">{uploadMessage}</p>}
                        </div>
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