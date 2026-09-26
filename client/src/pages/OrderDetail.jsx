import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useParams, useNavigate } from 'react-router-dom';
import { Breadcrumb, EmptyState, ProductSkeleton } from '../components/ui';
import { ONLINE_PAYMENT_ACCOUNTS, PAYMENT_METHOD_LABELS } from '../config/paymentAccounts';
import { orderService } from '../services';
import { API_BASE, API_VERSION } from '../services/api';
import { useAuthStore } from '../store';
import { useToast } from '../components/ToastProvider';
import { formatPrice } from '../utils/format';
import { validatePaymentReceiptFile } from '../utils/paymentValidation';
import ReceiptButtons from '../components/ReceiptButtons';
import { MART_INFO } from '../data/siteContent';
import { receiptService } from '../services';

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

const OrderDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { addToast } = useToast();
  const [order, setOrder] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

  const loadOrder = useCallback(async (showToast = false) => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const res = await orderService.getOrderById(id);
      const nextOrder = res.data?.data || null;
      setOrder((prevOrder) => {
        if (showToast && prevOrder && JSON.stringify(prevOrder) !== JSON.stringify(nextOrder)) {
          addToast('Order details were updated.', 'success');
        }
        return nextOrder;
      });
      setError('');
      try {
        const r = await receiptService.getReceiptByOrderId(id);
        setReceipt(r.data?.data?.receipt || null);
      } catch (e) {
        setReceipt(null);
      }
    } catch {
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  }, [id, isAuthenticated, addToast]);

  useEffect(() => {
    loadOrder();
  }, [id, isAuthenticated]);

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
        loadOrder(true);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [isAuthenticated, loadOrder]);

  const handleReceiptUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const receiptError = validatePaymentReceiptFile(file);
    if (receiptError) {
      setUploadMessage(receiptError);
      return;
    }

    setUploading(true);
    setUploadMessage('');
    const formData = new FormData();
    formData.append('receipt', file);

    try {
      await orderService.submitPaymentProof(id, formData);
      window.dispatchEvent(new Event('orders:updated'));
      await loadOrder();
      setUploadMessage('Payment proof uploaded successfully.');
    } catch {
      setUploadMessage('Failed to upload payment proof. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (!isAuthenticated) {
    const redirectTo = `/orders/${id}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirectTo)}`} replace />;
  }

  if (loading) {
    return (
      <div className="container-main animate-fade-in py-6">
        <ProductSkeleton count={3} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container-main animate-fade-in py-6">
        <div className="rounded-xl border border-gray-100 bg-white shadow-card">
          <EmptyState
            icon="📦"
            title="Order not found"
            description="The order you are trying to view could not be found."
            action={
              <Link
                to="/orders"
                className="inline-flex items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600"
              >
                Back to orders
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const receiptUrl = order.payment_receipt_url ? `${API_BASE}/${order.payment_receipt_url.replace(/^\/+/, '')}` : null;

  return (
    <div className="container-main animate-fade-in py-6">
      <Breadcrumb items={[
        { label: 'Home', to: '/' },
        { label: 'My Orders', to: '/orders' },
        { label: `Order #${order.display_order_id || order.id}` },
      ]} />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => {
              const from = location?.state?.from;
              if (from) navigate(from);
              else navigate(-1);
            }}
            className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-primary transition hover:underline"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-xl font-bold tracking-tight text-dark">Order #{order.display_order_id || order.id}</h1>
          <p className="text-sm text-gray-500">Placed on {new Date(order.created_at).toLocaleString('en-PK')}</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="text-right text-xs">
            <div className="text-xs text-gray-500">Invoice</div>
            <div className="whitespace-nowrap font-semibold text-gray-800">{receipt?.invoice_number || '—'}</div>
            <div className="mt-1 text-xs text-gray-500">Order</div>
            <div className="whitespace-nowrap font-semibold text-gray-800">{order.orderCode || order.display_order_id || order.id}</div>
          </div>
          <ReceiptButtons order={order} martInfo={MART_INFO} receipt={receipt} />
          <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[order.status] || 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-200'}`}>
            {order.status}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-card">
            <h2 className="mb-4 text-lg font-semibold text-dark">Order Overview</h2>
            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="mb-1 text-gray-500">Shipping Address</p>
                <p className="font-medium text-gray-800">{order.shipping_address || '—'}</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment Method</span>
                  <span className="font-semibold text-gray-800">{PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment Status</span>
                  <span className={`font-semibold capitalize ${PAYMENT_STYLES[order.payment_status] || 'text-gray-700'}`}>{order.payment_status}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-card">
            <h2 className="mb-4 text-lg font-semibold text-dark">Items</h2>

            <div className="space-y-3">
              {order.items?.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between gap-4 border-b border-gray-100 pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/products/${item.product_id}`}
                        className="font-semibold text-primary transition-colors hover:text-primary-600 hover:underline"
                      >
                        {item.product_name || 'Product'}
                      </Link>

                      {item.has_review ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Reviewed
                        </span>
                      ) : (
                        <Link
                          to={`/products/${item.product_id}`}
                          className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200 transition hover:bg-amber-100"
                        >
                          Write Review
                        </Link>
                      )}
                    </div>

                    {item.variant_label && (
                      <p className="mt-1 text-sm text-gray-500">Variant: {item.variant_label}</p>
                    )}

                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                  </div>

                  <p className="font-semibold text-gray-900">
                    {formatPrice(item.total_price || item.unit_price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {order.payment_method === 'online' && (
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-card">
              <h2 className="mb-3 text-lg font-semibold text-dark">Payment Status</h2>
              <div
                className={`rounded-xl border p-4 text-sm ${
                  order.payment_status === 'paid'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-amber-200 bg-amber-50 text-amber-900'
                }`}
              >
                <p className="font-semibold">
                  {order.payment_status === 'paid' ? 'Payment verified' : 'Awaiting payment verification'}
                </p>
                <p className="mt-2">
                  {order.payment_status === 'paid'
                    ? 'Your order is now eligible for processing.'
                    : 'Please complete the transfer and upload your receipt below.'}
                </p>
              </div>

              {order.payment_status !== 'paid' && (
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <p className="font-semibold">Transfer instructions</p>
                    <p className="mt-1">
                      Transfer {formatPrice(order.total_price)} to any account below and include order #{order.display_order_id || order.id} in the reference.
                    </p>
                  </div>
                  <div className="grid gap-2">
                    {ONLINE_PAYMENT_ACCOUNTS.map((account) => (
                      <div key={`${account.type}-${account.account}`} className="rounded-lg border border-gray-200 p-3 text-sm">
                        <p className="font-semibold text-gray-800">{account.type}</p>
                        {account.provider && account.type === 'Bank' && <p className="text-gray-600">{account.provider}</p>}
                        <p className="text-gray-600">{account.account}</p>
                        <p className="text-gray-600">{account.accountHolder}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3">
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Upload payment receipt</label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleReceiptUpload}
                      className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3.5 file:py-2 file:text-sm file:font-semibold file:text-white file:transition hover:file:bg-primary-600"
                    />
                    {uploading && (
                      <p className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                        Uploading...
                      </p>
                    )}
                    {uploadMessage && <p className="mt-2 text-sm text-gray-600">{uploadMessage}</p>}
                  </div>
                  {receiptUrl && (
                    <a
                      href={receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                    >
                      View uploaded receipt
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-card">
            <h2 className="mb-3 text-lg font-semibold text-dark">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-800">{formatPrice(Number(order.total_price) - Number(order.shipping_cost || 0))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Shipping</span>
                <span className="text-gray-800">{formatPrice(order.shipping_cost || 0)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2 font-semibold">
                <span>Total</span>
                <span className="text-primary">{formatPrice(order.total_price)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;