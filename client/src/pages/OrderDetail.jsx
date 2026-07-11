import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Breadcrumb, EmptyState, ProductSkeleton } from '../components/ui';
import { ONLINE_PAYMENT_ACCOUNTS, PAYMENT_METHOD_LABELS } from '../config/paymentAccounts';
import { orderService } from '../services';
import { API_BASE } from '../services/api';
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

const OrderDetail = () => {
  const { id } = useParams();
  const { isAuthenticated } = useAuthStore();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;

    setLoading(true);
    orderService.getOrderById(id)
      .then((res) => setOrder(res.data?.data || null))
      .catch(() => setError('Failed to load order details'))
      .finally(() => setLoading(false));
  }, [id, isAuthenticated]);

  const handleReceiptUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadMessage('');
    const formData = new FormData();
    formData.append('receipt', file);

    try {
      await orderService.submitPaymentProof(id, formData);
      const res = await orderService.getOrderById(id);
      setOrder(res.data?.data || null);
      setUploadMessage('Payment proof uploaded successfully.');
    } catch {
      setUploadMessage('Failed to upload payment proof. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="container-main py-6 animate-fade-in">
        <ProductSkeleton count={3} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container-main py-6 animate-fade-in">
        <EmptyState
          icon="📦"
          title="Order not found"
          description="The order you are trying to view could not be found."
          action={<Link to="/orders" className="btn-primary">Back to orders</Link>}
        />
      </div>
    );
  }

  const receiptUrl = order.payment_receipt_url ? `${API_BASE}/${order.payment_receipt_url.replace(/^\/+/, '')}` : null;

  return (
    <div className="container-main py-6 animate-fade-in">
      <Breadcrumb items={[
        { label: 'Home', to: '/' },
        { label: 'My Orders', to: '/orders' },
        { label: `Order #${order.display_order_id || order.id}` },
      ]} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-dark">Order #{order.display_order_id || order.id}</h1>
          <p className="text-sm text-gray-500">Placed on {new Date(order.created_at).toLocaleString('en-PK')}</p>
        </div>
        <span className={`inline-flex w-fit rounded-sm px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-700'}`}>
          {order.status}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-sm text-sm mb-4">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-sm shadow-card p-5">
            <h2 className="font-semibold text-lg mb-4">Order Overview</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Shipping Address</p>
                <p className="font-medium">{order.shipping_address || '—'}</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment Method</span>
                  <span className="font-semibold">{PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment Status</span>
                  <span className={`font-semibold capitalize ${PAYMENT_STYLES[order.payment_status] || ''}`}>{order.payment_status}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-sm shadow-card p-5">
            <h2 className="font-semibold text-lg mb-4">Items</h2>
            <div className="space-y-3">
              {order.items?.map((item) => (
                <div key={item.id} className="flex justify-between gap-4 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium">{item.product_name || 'Product'}</p>
                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-primary">{formatPrice(item.total_price || item.unit_price * item.quantity)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {order.payment_method === 'online' && (
            <div className="bg-white rounded-sm shadow-card p-5">
              <h2 className="font-semibold text-lg mb-3">Payment Status</h2>
              <div className={`rounded-sm border p-4 text-sm ${order.payment_status === 'paid' ? 'bg-green-50 border-green-200 text-green-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                <p className="font-semibold">{order.payment_status === 'paid' ? 'Payment verified' : 'Awaiting payment verification'}</p>
                <p className="mt-2">{order.payment_status === 'paid' ? 'Your order is now eligible for processing.' : 'Please complete the transfer and upload your receipt below.'}</p>
              </div>

              {order.payment_status !== 'paid' && (
                <div className="mt-4 space-y-3">
                  <div className="rounded-sm border border-amber-200 bg-amber-50 p-3 text-sm">
                    <p className="font-semibold">Transfer instructions</p>
                    <p className="mt-1">Transfer {formatPrice(order.total_price)} to any account below and include order #{order.display_order_id || order.id} in the reference.</p>
                  </div>
                  <div className="grid gap-2">
                    {ONLINE_PAYMENT_ACCOUNTS.map((account) => (
                      <div key={`${account.type}-${account.account}`} className="rounded-sm border border-gray-200 p-3 text-sm">
                        <p className="font-semibold">{account.type}</p>
                        {account.provider && account.type === 'Bank' && <p>{account.provider}</p>}
                        <p>{account.account}</p>
                        <p>{account.accountHolder}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-sm border border-gray-200 p-3">
                    <label className="mb-2 block text-sm font-semibold">Upload payment receipt</label>
                    <input type="file" accept="image/*,.pdf" onChange={handleReceiptUpload} className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-sm file:border-0 file:bg-primary file:px-3 file:py-2 file:text-white" />
                    {uploading && <p className="mt-2 text-sm">Uploading...</p>}
                    {uploadMessage && <p className="mt-2 text-sm">{uploadMessage}</p>}
                  </div>
                  {receiptUrl && (
                    <a href={receiptUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary hover:underline">
                      View uploaded receipt
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-sm shadow-card p-5">
            <h2 className="font-semibold text-lg mb-3">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatPrice(Number(order.total_price) - Number(order.shipping_cost || 0))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Shipping</span>
                <span>{formatPrice(order.shipping_cost || 0)}</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t border-gray-100">
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
