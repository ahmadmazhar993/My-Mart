import React, { useCallback, useEffect, useState } from 'react';
import useLiveRefresh from '../../hooks/useLiveRefresh';
import { Link, useParams } from 'react-router-dom';
import { sellerPortalService } from '../../services';
import { useToast } from '../../components/ToastProvider';
import {
  Button, Card, ErrorState, Loading, PageHeader, StatusBadge, apiError, formatDateTime, imageSrc, money,
} from '../../components/seller/ui';

const NEXT = {
  pending: { to: 'processing', label: 'Start processing' },
  processing: { to: 'ready_to_ship', label: 'Mark ready to ship' },
  ready_to_ship: { to: 'shipped', label: 'Mark as shipped' },
};
const LABEL = {
  pending: 'Not started', processing: 'Processing', ready_to_ship: 'Ready to ship', shipped: 'Shipped',
};

const SellerOrderDetail = () => {
  const { id } = useParams();
  const { addToast } = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    return sellerPortalService.getOrder(id)
      .then((res) => setOrder(res.data.data))
      .catch((err) => setError(apiError(err, 'Could not load this order.')))
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(() => { load(); }, [load]);
  useLiveRefresh(['order'], () => load(true));

  const advance = async (to) => {
    setBusy(true);
    try {
      const res = await sellerPortalService.updateFulfillment(id, to);
      setOrder(res.data.data);
      addToast(`Marked as ${LABEL[to].toLowerCase()}.`);
    } catch (err) {
      addToast(apiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading && !order) return <Loading text="Loading order" />;
  if (error) return <div className="space-y-3"><Link to="/seller/orders" className="text-sm font-semibold text-primary">← Back to orders</Link><ErrorState message={error} onRetry={load} /></div>;

  // Steps still available for at least one item; the server only moves items that are on the previous step.
  const stagesPresent = [...new Set(order.items.map((item) => item.fulfillment_status))];
  const actions = stagesPresent.filter((stage) => NEXT[stage]).map((stage) => NEXT[stage]);

  return (
    <div className="animate-fade-in space-y-5">
      <Link to="/seller/orders" className="inline-block text-sm font-semibold text-primary hover:underline">← Back to orders</Link>
      <PageHeader
        title={`Order #${order.order_code}`}
        subtitle={`Placed ${formatDateTime(order.created_at)}`}
        actions={<><StatusBadge status={order.order_status} /><StatusBadge status={order.payment_status} /></>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Your items in this order">
            <ul className="divide-y divide-gray-50">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-3 py-3">
                  {item.image_url ? <img src={imageSrc(item.image_url)} alt="" className="h-14 w-14 flex-shrink-0 rounded-md object-cover" /> : <span className="h-14 w-14 flex-shrink-0 rounded-md bg-gray-100" />}
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-semibold text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.variant ? `${item.variant} · ` : ''}SKU: {item.sku || '—'}</p>
                    <p className="mt-1 text-sm text-gray-600">{item.quantity} × {money(item.unit_price)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{money(item.total_price)}</p>
                    <div className="mt-1"><StatusBadge status={item.fulfillment_status} /></div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-between border-t border-gray-100 pt-3 text-sm">
              <span className="text-gray-500">Your items total</span>
              <strong>{money(order.seller_subtotal)}</strong>
            </div>
            <p className="mt-1 text-xs text-gray-400">Shows only your products. Prices already include any product discount; delivery charges are not part of this total.</p>
          </Card>

          <Card title="Fulfillment">
            {order.can_fulfil ? (
              <>
                <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-gray-600">
                  <li>Start processing once you begin preparing the items.</li>
                  <li>Pack each item securely and include the order number #{order.order_code} on the parcel.</li>
                  <li>Mark ready to ship when the parcel is packed and ready for the courier.</li>
                  <li>Mark as shipped when it has been handed over. AHM Mart marks the order delivered.</li>
                </ol>
                {actions.length ? (
                  <div className="flex flex-wrap gap-2">
                    {actions.map((action) => (
                      <Button key={action.to} busy={busy} onClick={() => advance(action.to)}>{action.label}</Button>
                    ))}
                  </div>
                ) : <p className="text-sm text-emerald-700">All your items have been shipped.</p>}
              </>
            ) : (
              <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                {order.order_status === 'cancelled'
                  ? 'This order was cancelled. Do not ship these items.'
                  : order.payment_method !== 'cod' && order.payment_status !== 'paid'
                    ? 'Waiting for AHM Mart to confirm payment. You can start fulfilling once it is confirmed.'
                    : order.order_status === 'delivered'
                      ? 'This order has been delivered.'
                      : 'Waiting for AHM Mart to confirm this order. You can start fulfilling once it is confirmed.'}
              </p>
            )}
          </Card>

          <Card title="Status history">
            {order.history.length === 0 ? <p className="text-sm text-gray-500">No fulfillment updates yet.</p> : (
              <ul className="space-y-2 text-sm">
                {order.history.map((entry, index) => {
                  const item = order.items.find((i) => i.id === entry.item_id);
                  return (
                    <li key={index} className="flex flex-wrap justify-between gap-2">
                      <span className="text-gray-700">{item?.name || 'Item'}: {LABEL[entry.from] || '—'} → <strong>{LABEL[entry.to]}</strong></span>
                      <span className="text-xs text-gray-400">{formatDateTime(entry.at)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Delivery details">
            {order.delivery ? (
              <dl className="space-y-3 text-sm">
                <div><dt className="text-xs text-gray-400">Recipient</dt><dd className="font-medium">{order.delivery.recipient}</dd></div>
                {order.delivery.phone ? <div><dt className="text-xs text-gray-400">Phone</dt><dd>{order.delivery.phone}</dd></div> : null}
                <div><dt className="text-xs text-gray-400">Address</dt><dd className="whitespace-pre-line break-words">{order.delivery.address}</dd></div>
              </dl>
            ) : <p className="text-sm text-gray-500">Delivery details are hidden for cancelled orders.</p>}
          </Card>
          <Card title="Payment">
            <dl className="space-y-3 text-sm">
              <div><dt className="text-xs text-gray-400">Method</dt><dd className="font-medium">{order.payment_method === 'cod' ? 'Cash on delivery' : 'Online transfer'}</dd></div>
              <div><dt className="text-xs text-gray-400">Status</dt><dd><StatusBadge status={order.payment_status} /></dd></div>
            </dl>
            {order.payment_method === 'cod' ? <p className="mt-3 text-xs text-gray-400">Cash on delivery: payment is collected when the order is delivered, and AHM Mart records it.</p> : null}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SellerOrderDetail;
