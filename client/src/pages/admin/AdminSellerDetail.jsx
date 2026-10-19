import React, { useCallback, useEffect, useRef, useState } from 'react';
import useLiveRefresh from '../../hooks/useLiveRefresh';
import { Link, useParams } from 'react-router-dom';
import { adminSellerService } from '../../services';
import { useToast } from '../../components/ToastProvider';
import {
  Button, Card, ConfirmDialog, Empty, ErrorState, Loading, PageHeader, Pagination, StatusBadge,
  apiError, formatDate, formatDateTime, imageSrc, money,
} from '../../components/seller/ui';

const TABS = [['overview', 'Overview'], ['products', 'Products'], ['orders', 'Orders'], ['audit', 'Audit log']];

const ProductsTab = ({ sellerId }) => {
  const [state, setState] = useState({ loading: true, rows: [], pagination: null, error: '' });
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const silent = useRef(false);
  useLiveRefresh(['product', 'inventory'], () => { silent.current = true; setTick((t) => t + 1); });
  useEffect(() => {
    if (!silent.current) setState((s) => ({ ...s, loading: true }));
    silent.current = false;
    adminSellerService.listSellerProducts(sellerId, { page, limit: 10 })
      .then((res) => setState({ loading: false, rows: res.data.data, pagination: res.data.pagination, error: '' }))
      .catch((err) => setState({ loading: false, rows: [], pagination: null, error: apiError(err) }));
  }, [sellerId, page, tick]);

  if (state.loading) return <Loading minHeight={160} />;
  if (state.error) return <ErrorState message={state.error} />;
  if (!state.rows.length) return <Empty title="No products" />;
  return (
    <>
      <ul className="divide-y divide-gray-50">
        {state.rows.map((p) => (
          <li key={p.id} className="flex items-center gap-3 py-3">
            {p.image_url ? <img src={imageSrc(p.image_url)} alt="" className="h-11 w-11 flex-shrink-0 rounded-md object-cover" /> : <span className="h-11 w-11 flex-shrink-0 rounded-md bg-gray-100" />}
            <div className="min-w-0 flex-1"><p className="truncate font-medium">{p.name}</p><p className="text-xs text-gray-400">{money(p.discount_price ?? p.price)} · stock {p.stock_quantity}</p></div>
            <StatusBadge status={p.approval_status === 'approved' && !p.is_active ? 'unpublished' : p.approval_status} />
          </li>
        ))}
      </ul>
      <Pagination pagination={state.pagination} onPage={setPage} />
    </>
  );
};

const OrdersTab = ({ sellerId }) => {
  const [state, setState] = useState({ loading: true, rows: [], pagination: null, error: '' });
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const silent = useRef(false);
  useLiveRefresh(['order'], () => { silent.current = true; setTick((t) => t + 1); });
  useEffect(() => {
    if (!silent.current) setState((s) => ({ ...s, loading: true }));
    silent.current = false;
    adminSellerService.listSellerOrders(sellerId, { page, limit: 10 })
      .then((res) => setState({ loading: false, rows: res.data.data, pagination: res.data.pagination, error: '' }))
      .catch((err) => setState({ loading: false, rows: [], pagination: null, error: apiError(err) }));
  }, [sellerId, page, tick]);

  if (state.loading) return <Loading minHeight={160} />;
  if (state.error) return <ErrorState message={state.error} />;
  if (!state.rows.length) return <Empty title="No orders" />;
  return (
    <>
      <ul className="divide-y divide-gray-50">
        {state.rows.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div><Link to={`/orders/${o.id}`} className="font-semibold text-primary hover:underline">#{o.order_code}</Link><p className="text-xs text-gray-400">{formatDate(o.created_at)} · {o.units} item(s)</p></div>
            <div className="flex items-center gap-2"><StatusBadge status={o.order_status} /><StatusBadge status={o.fulfillment_status} /><strong>{money(o.seller_subtotal)}</strong></div>
          </li>
        ))}
      </ul>
      <Pagination pagination={state.pagination} onPage={setPage} />
    </>
  );
};

const AdminSellerDetail = () => {
  const { id } = useParams();
  const { addToast } = useToast();
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');
  const [dialog, setDialog] = useState(null); // 'approve' | 'reject' | 'suspend' | 'reactivate'

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    return adminSellerService.getSeller(id)
      .then((res) => setSeller(res.data.data))
      .catch((err) => setError(apiError(err, 'Could not load this seller.')))
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(() => { load(); }, [load]);
  useLiveRefresh(['seller', 'product', 'order', 'payout'], () => load(true));

  if (loading && !seller) return <Loading text="Loading seller" />;
  if (error) return <div className="space-y-3"><Link to="/admin/sellers" className="text-sm font-semibold text-primary">← All sellers</Link><ErrorState message={error} onRetry={load} /></div>;

  const run = (fn, message) => async (reason) => {
    await fn(reason);
    addToast(message);
    setDialog(null);
    load();
  };
  const DIALOGS = {
    approve: {
      title: 'Approve this seller?', confirmLabel: 'Approve seller',
      message: `${seller.shop_name} will be able to list products (each still needs approval) and manage their orders. Their account gets the Seller role.`,
      onConfirm: run(() => adminSellerService.approve(id), 'Seller approved.'),
    },
    reject: {
      title: 'Reject this application?', confirmLabel: 'Reject application', danger: true, requireReason: true, reasonLabel: 'Reason shown to the applicant',
      onConfirm: run((reason) => adminSellerService.reject(id, reason), 'Application rejected.'),
    },
    suspend: {
      title: 'Suspend this seller?', confirmLabel: 'Suspend seller', danger: true, requireReason: true, reasonLabel: 'Reason shown to the seller',
      message: 'Their dashboard access is blocked and all their products are hidden from the store immediately.',
      onConfirm: run((reason) => adminSellerService.suspend(id, reason), 'Seller suspended.'),
    },
    reactivate: {
      title: 'Reactivate this seller?', confirmLabel: 'Reactivate',
      message: 'Dashboard access is restored. Their products stay unpublished until the seller publishes them again.',
      onConfirm: run(() => adminSellerService.reactivate(id), 'Seller reactivated.'),
    },
  };
  const dlg = dialog ? DIALOGS[dialog] : null;

  return (
    <div className="animate-fade-in space-y-5">
      <Link to="/admin/sellers" className="inline-block text-sm font-semibold text-primary hover:underline">← All sellers</Link>
      <PageHeader
        title={seller.shop_name}
        subtitle={`${seller.user.name} · ${seller.user.email}`}
        actions={(
          <>
            <StatusBadge status={seller.status} />
            {seller.status === 'pending' ? <><Button onClick={() => setDialog('approve')}>Approve</Button><Button variant="danger" onClick={() => setDialog('reject')}>Reject</Button></> : null}
            {seller.status === 'approved' ? <Button variant="danger" onClick={() => setDialog('suspend')}>Suspend</Button> : null}
            {seller.status === 'suspended' ? <Button onClick={() => setDialog('reactivate')}>Reactivate</Button> : null}
          </>
        )}
      />

      <div role="tablist" aria-label="Seller sections" className="flex gap-1 overflow-x-auto border-b border-gray-200">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`min-h-[44px] whitespace-nowrap border-b-2 px-4 text-sm font-medium transition ${tab === key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Application">
            <dl className="space-y-3 text-sm">
              <div><dt className="text-xs text-gray-400">Phone</dt><dd>{seller.contact_phone || '—'}</dd></div>
              <div><dt className="text-xs text-gray-400">Business address</dt><dd className="whitespace-pre-line">{seller.business_address || '—'}</dd></div>
              <div><dt className="text-xs text-gray-400">Description</dt><dd className="whitespace-pre-line break-words">{seller.shop_description || '—'}</dd></div>
              <div><dt className="text-xs text-gray-400">Applied</dt><dd>{formatDate(seller.applied_on)}</dd></div>
              {seller.reviewed_on ? <div><dt className="text-xs text-gray-400">Last reviewed</dt><dd>{formatDate(seller.reviewed_on)}</dd></div> : null}
              {seller.rejection_reason ? <div><dt className="text-xs text-gray-400">Rejection reason</dt><dd className="text-rose-700">{seller.rejection_reason}</dd></div> : null}
              {seller.suspended_reason ? <div><dt className="text-xs text-gray-400">Suspension reason</dt><dd className="text-rose-700">{seller.suspended_reason}</dd></div> : null}
            </dl>
          </Card>
          <Card title="Performance">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-gray-500">Gross sales</dt><dd className="text-lg font-bold">{money(seller.performance.gross_sales)}</dd></div>
              <div><dt className="text-gray-500">Orders</dt><dd className="text-lg font-bold">{seller.performance.orders}</dd></div>
              <div><dt className="text-gray-500">Cancelled orders</dt><dd className="text-lg font-bold">{seller.performance.cancelled_orders}</dd></div>
              <div><dt className="text-gray-500">Refunded orders</dt><dd className="text-lg font-bold">{seller.performance.refunded_orders}</dd></div>
            </dl>
            <h4 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-gray-400">Products by status</h4>
            <div className="flex flex-wrap gap-2">
              {Object.keys(seller.products_by_status).length === 0 ? <span className="text-sm text-gray-500">No products</span> : Object.entries(seller.products_by_status).map(([status, count]) => (
                <span key={status} className="inline-flex items-center gap-1.5"><StatusBadge status={status} /><span className="text-sm font-semibold">{count}</span></span>
              ))}
            </div>
          </Card>
        </div>
      ) : null}
      {tab === 'products' ? <Card><ProductsTab sellerId={id} /></Card> : null}
      {tab === 'orders' ? <Card><OrdersTab sellerId={id} /></Card> : null}
      {tab === 'audit' ? (
        <Card title="Audit log">
          {seller.audit_log.length === 0 ? <p className="text-sm text-gray-500">No recorded actions.</p> : (
            <ul className="divide-y divide-gray-50 text-sm">
              {seller.audit_log.map((entry, index) => (
                <li key={index} className="flex flex-wrap justify-between gap-2 py-2.5">
                  <span><strong>{entry.action}</strong> — {entry.description}{entry.by ? <span className="text-gray-400"> · by {entry.by}</span> : null}</span>
                  <span className="text-xs text-gray-400">{formatDateTime(entry.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      <ConfirmDialog open={Boolean(dlg)} {...(dlg || {})} onClose={() => setDialog(null)} />
    </div>
  );
};

export default AdminSellerDetail;
