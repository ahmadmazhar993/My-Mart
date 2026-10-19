import React, { useCallback, useEffect, useState } from 'react';
import useLiveRefresh from '../hooks/useLiveRefresh';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { returnService } from '../services';
import { useAuthStore } from '../store';
import { useToast } from '../components/ToastProvider';
import {
  Button, ConfirmDialog, Empty, ErrorState, Loading, StatusBadge, apiError, formatDate, money,
} from '../components/seller/ui';
import ReturnThread, { EvidenceGallery, REASON_LABEL } from '../components/seller/ReturnThread';

const LABEL = {
  requested: 'Awaiting review', approved: 'Approved', received: 'Received', refunded: 'Refunded', rejected: 'Rejected', cancelled: 'Cancelled',
};
const Status = ({ status }) => <StatusBadge status={{ requested: 'pending', received: 'processing', refunded: 'refunded' }[status] || status} label={LABEL[status]} />;

const Detail = ({ id, onChanged }) => {
  const { addToast } = useToast();
  const [ret, setRet] = useState(null);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const load = useCallback(() => {
    return returnService.get(id).then((res) => { setRet(res.data.data); setError(''); }).catch((err) => setError(apiError(err)));
  }, [id]);
  useEffect(() => { load(); }, [load]);
  useLiveRefresh(['return'], () => load(true));

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!ret) return <Loading minHeight={160} />;
  const open = !['cancelled', 'rejected', 'refunded'].includes(ret.status);
  return (
    <div className="space-y-4 rounded-xl border border-gray-100 bg-white p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><h2 className="font-bold text-dark">{ret.product} × {ret.quantity}</h2><p className="text-xs text-gray-500">Order #{ret.order_code} · {formatDate(ret.created_at)}</p></div>
        <Status status={ret.status} />
      </div>
      <p className="text-sm text-gray-700"><strong>Reason:</strong> {REASON_LABEL[ret.reason] || ret.reason}</p>
      {ret.decision_note ? <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">AHM Mart: {ret.decision_note}</p> : null}
      {ret.status === 'refunded' ? <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Refund of {money(ret.refund_amount)} has been completed.</p> : null}
      <EvidenceGallery images={ret.evidence} />
      <ReturnThread messages={ret.messages || []} canReply={open} onSend={async (body) => { await returnService.message(id, body); load(); }} />
      {ret.status === 'requested' ? <Button variant="outline" onClick={() => setCancelling(true)}>Cancel this request</Button> : null}
      <ConfirmDialog
        open={cancelling} danger title="Cancel return request?" message="You can submit a new request later if the return window is still open." confirmLabel="Cancel request"
        onClose={() => setCancelling(false)}
        onConfirm={async () => { await returnService.cancel(id); addToast('Return cancelled.'); setCancelling(false); load(); onChanged(); }}
      />
    </div>
  );
};

const MyReturns = () => {
  const { isAuthenticated } = useAuthStore();
  const [params, setParams] = useSearchParams();
  const [state, setState] = useState({ loading: true, rows: [], error: '' });
  const openId = params.get('open');

  const load = useCallback(() => {
    return returnService.mine()
      .then((res) => setState({ loading: false, rows: res.data.data, error: '' }))
      .catch((err) => setState({ loading: false, rows: [], error: apiError(err, 'Could not load your returns.') }));
  }, []);
  useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated, load]);
  useLiveRefresh(['return'], () => load(), { enabled: isAuthenticated });

  if (!isAuthenticated) return <Navigate to="/login?redirect=/returns" replace />;

  return (
    <div className="container-main mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-extrabold text-dark">My returns</h1>
      <p className="mt-1 text-sm text-gray-500">Request a return from a delivered order. <Link to="/orders" className="font-semibold text-primary hover:underline">Go to my orders</Link></p>
      <div className="mt-5 space-y-4">
        {state.error ? <ErrorState message={state.error} onRetry={load} /> : null}
        {state.loading ? <Loading text="Loading returns" minHeight={200} /> : null}
        {!state.loading && !state.error && state.rows.length === 0 ? <Empty title="No returns yet" text="Returns you request will be listed here with their status." /> : null}
        {state.rows.map((r) => (
          <div key={r.id}>
            {openId === r.id ? <Detail id={r.id} onChanged={load} /> : (
              <button type="button" onClick={() => setParams({ open: r.id })} className="block w-full rounded-xl border border-gray-100 bg-white p-4 text-left shadow-card hover:border-primary-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-gray-900">{r.product} × {r.quantity}</span><Status status={r.status} />
                </div>
                <p className="mt-1 text-xs text-gray-500">Order #{r.order_code} · {formatDate(r.created_at)} · {REASON_LABEL[r.reason] || r.reason}</p>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyReturns;
