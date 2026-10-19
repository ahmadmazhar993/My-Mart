import React, { useCallback, useEffect, useState } from 'react';
import useLiveRefresh from '../../hooks/useLiveRefresh';
import useLatestRequest from '../../hooks/useLatestRequest';
import { Link, useParams } from 'react-router-dom';
import { sellerPortalService } from '../../services';
import { useToast } from '../../components/ToastProvider';
import {
  Button, Card, ConfirmDialog, Empty, ErrorState, Loading, PageHeader, Pagination, StatusBadge, CARD_LIST_ITEM,
  apiError, formatDate, money,
} from '../../components/seller/ui';
import { ListToolbar, useListFilters } from '../../components/seller/filters';
import ReturnThread, { EvidenceGallery, REASON_LABEL } from '../../components/seller/ReturnThread';

const STATUSES = [['', 'All returns'], ['requested', 'Awaiting AHM Mart review'], ['approved', 'Approved'], ['received', 'Received'], ['refunded', 'Refunded'], ['rejected', 'Rejected'], ['cancelled', 'Cancelled']];
const STATUS_LABEL = {
  requested: 'Awaiting review', approved: 'Approved', received: 'Received', refunded: 'Refunded', rejected: 'Rejected', cancelled: 'Cancelled',
};
const Status = ({ status }) => <StatusBadge status={{ requested: 'pending', received: 'processing', refunded: 'refunded' }[status] || status} label={STATUS_LABEL[status]} />;

const DEFAULTS = { search: '', status: '' };
const FILTERS = [{ key: 'status', label: 'Status', options: STATUSES }];

export const SellerReturns = () => {
  const [filters, setFilters, reset] = useListFilters(DEFAULTS);
  const [state, setState] = useState({ loading: true, rows: [], pagination: null, error: '' });
  const latest = useLatestRequest();
  const load = useCallback((silent = false) => {
    if (!silent) setState((s) => ({ ...s, loading: true, error: '' }));
    return latest.guard(sellerPortalService.listReturns({
      search: filters.search || undefined, status: filters.status || undefined, page: filters.page, limit: 15,
    }))
      .then((res) => setState({ loading: false, rows: res.data.data, pagination: res.data.pagination, error: '' }))
      .catch((err) => setState((s) => ({ ...s, loading: false, error: apiError(err, 'Could not load returns.') })));
  }, [filters]);
  useEffect(() => { load(); }, [load]);
  useLiveRefresh(['return'], () => load(true));
  const filtered = filters.search || filters.status;

  return (
    <div className="animate-fade-in space-y-4">
      <ListToolbar
        title="Returns"
        subtitle="Return requests for your products. AHM Mart makes the final decision and completes refunds."
        searchPlaceholder="Search order number"
        searchLabel="Search returns by order number"
        filters={FILTERS}
        values={filters}
        defaults={DEFAULTS}
        onChange={setFilters}
        onReset={reset}
        total={state.pagination?.total}
        loading={state.loading}
        noun="returns"
      />
      {state.error ? <ErrorState message={state.error} onRetry={load} /> : null}
      {state.loading && state.rows.length === 0 ? <Loading text="Loading returns" /> : null}
      {!state.loading && !state.error && state.rows.length === 0 ? (
        <Empty
          title={filtered ? 'No returns match your filters' : 'No return requests'}
          text={filtered ? 'Try removing a filter.' : 'When a customer asks to return one of your products it will appear here.'}
          action={filtered ? <Button variant="outline" onClick={reset}>Clear filters</Button> : null}
        />
      ) : null}
      <ul className={`space-y-3 transition ${state.loading ? 'opacity-60' : ''}`} aria-busy={state.loading}>
        {state.rows.map((r) => (
          <li key={r.id}>
            <Link to={`/seller/returns/${r.id}`} className={`${CARD_LIST_ITEM} block hover:border-primary-200`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words font-semibold text-gray-900">{r.product} × {r.quantity}</p>
                  <p className="text-xs text-gray-500">Order #{r.order_code} · {r.customer?.name} · {formatDate(r.created_at)}</p>
                </div>
                <Status status={r.status} />
              </div>
              <p className="mt-2 text-sm text-gray-600">{REASON_LABEL[r.reason] || r.reason}</p>
            </Link>
          </li>
        ))}
      </ul>
      <Pagination pagination={state.pagination} onPage={(page) => setFilters({ page })} />
    </div>
  );
};

export const SellerReturnDetail = () => {
  const { id } = useParams();
  const { addToast } = useToast();
  const [ret, setRet] = useState(null);
  const [error, setError] = useState('');
  const [receiving, setReceiving] = useState(false);

  const latest = useLatestRequest();
  const load = useCallback(() => {
    return latest.guard(sellerPortalService.getReturn(id))
      .then((res) => { setRet(res.data.data); setError(''); })
      .catch((err) => setError(apiError(err, 'Could not load this return.')));
  }, [id]);
  useEffect(() => { load(); }, [load]);
  useLiveRefresh(['return'], () => load(true));

  if (error) return <div className="space-y-3"><Link to="/seller/returns" className="text-sm font-semibold text-primary">← Back to returns</Link><ErrorState message={error} onRetry={load} /></div>;
  if (!ret) return <Loading text="Loading return" />;
  const open = !['cancelled', 'rejected', 'refunded'].includes(ret.status);

  return (
    <div className="animate-fade-in space-y-5">
      <Link to="/seller/returns" className="inline-block text-sm font-semibold text-primary hover:underline">← Back to returns</Link>
      <PageHeader title={`${ret.product} × ${ret.quantity}`} subtitle={`Order #${ret.order_code} · requested ${formatDate(ret.created_at)}`} actions={<Status status={ret.status} />} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Customer's request">
            <dl className="space-y-3 text-sm">
              <div><dt className="text-xs text-gray-400">Reason</dt><dd className="font-medium">{REASON_LABEL[ret.reason] || ret.reason}</dd></div>
              {ret.details ? <div><dt className="text-xs text-gray-400">Details</dt><dd className="whitespace-pre-line break-words">{ret.details}</dd></div> : null}
              <div><dt className="text-xs text-gray-400">Photos</dt><dd className="mt-1"><EvidenceGallery images={ret.evidence} /></dd></div>
            </dl>
          </Card>
          <Card title="Conversation"><ReturnThread messages={ret.messages || []} canReply={open} onSend={async (body) => { await sellerPortalService.messageReturn(id, body); load(); }} /></Card>
        </div>
        <div className="space-y-4">
          <Card title="What happens next">
            {ret.status === 'requested' ? <p className="text-sm text-gray-600">AHM Mart is reviewing this request. You can reply to the customer in the meantime. No action is needed on the item yet.</p> : null}
            {ret.status === 'approved' ? (
              <>
                <p className="text-sm text-gray-600">AHM Mart approved this return{ret.decision_note ? `: ${ret.decision_note}` : '.'} When the item arrives back, record its condition.</p>
                <Button className="mt-3 w-full" onClick={() => setReceiving(true)}>Record item received</Button>
              </>
            ) : null}
            {ret.status === 'received' ? <p className="text-sm text-gray-600">You recorded the item as received. AHM Mart will complete the refund. Inspection note: {ret.inspection_note}</p> : null}
            {ret.status === 'refunded' ? <p className="text-sm text-gray-600">Refunded {money(ret.refund_amount)}. The refund and the matching commission were adjusted in your earnings. Restock the item from Inventory if it is resellable.</p> : null}
            {ret.status === 'rejected' ? <p className="text-sm text-gray-600">AHM Mart rejected this return{ret.decision_note ? `: ${ret.decision_note}` : '.'}</p> : null}
            {ret.status === 'cancelled' ? <p className="text-sm text-gray-600">The customer cancelled this request.</p> : null}
            <p className="mt-3 text-xs text-gray-400">Sellers cannot issue refunds. Only AHM Mart can complete one.</p>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={receiving}
        requireReason
        reasonLabel="Item condition / inspection notes"
        title="Record returned item"
        message="Confirm the item arrived and describe its condition."
        confirmLabel="Save"
        onClose={() => setReceiving(false)}
        onConfirm={async (text) => {
          await sellerPortalService.receiveReturn(id, text);
          addToast('Recorded.');
          setReceiving(false);
          load();
        }}
      />
    </div>
  );
};

export default SellerReturns;
