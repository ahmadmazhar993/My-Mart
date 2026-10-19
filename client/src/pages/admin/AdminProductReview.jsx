import React, { useCallback, useEffect, useState } from 'react';
import useLiveRefresh from '../../hooks/useLiveRefresh';
import useLatestRequest from '../../hooks/useLatestRequest';
import { Link } from 'react-router-dom';
import { adminSellerService } from '../../services';
import { useToast } from '../../components/ToastProvider';
import {
  Button, ConfirmDialog, Empty, ErrorState, Loading, Pagination, StatusBadge,
  apiError, formatDate, imageSrc, money,
} from '../../components/seller/ui';
import { ListToolbar, useListFilters } from '../../components/seller/filters';

const DEFAULTS = { status: 'pending_review' };
const FILTERS = [{ key: 'status', label: 'Queue', options: [['pending_review', 'Awaiting review'], ['rejected', 'Rejected'], ['approved', 'Approved (seller-submitted)']] }];

const AdminProductReview = () => {
  const { addToast } = useToast();
  const [filters, setFilters, reset] = useListFilters(DEFAULTS);
  const { status, page } = filters;
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [preview, setPreview] = useState(null);

  const latest = useLatestRequest();
  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    return latest.guard(adminSellerService.listReviewQueue({ status, page, limit: 10 }))
      .then((res) => { setRows(res.data.data); setPagination(res.data.pagination); })
      .catch((err) => setError(apiError(err, 'Could not load the review queue.')))
      .finally(() => setLoading(false));
  }, [status, page]);
  useEffect(() => { load(); }, [load]);
  useLiveRefresh(['product'], () => load(true));

  const approve = async (product) => {
    setBusyId(product.id);
    try {
      await adminSellerService.approveProduct(product.id);
      addToast(`"${product.name}" approved.`);
      load();
    } catch (err) {
      addToast(apiError(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="animate-fade-in space-y-5">
      <ListToolbar
        title="Product review"
        subtitle="Seller-submitted products must be approved before they appear on the store."
        hideSearch
        filters={FILTERS}
        values={{ ...filters, search: '' }}
        defaults={{ ...DEFAULTS, search: '' }}
        onChange={setFilters}
        onReset={reset}
        total={pagination?.total}
        loading={loading}
        noun="products"
        actions={<Link to="/admin/sellers" className="btn-secondary inline-flex min-h-[44px] items-center !px-4 !py-2.5 text-sm">All sellers</Link>}
      />

      {error ? <ErrorState message={error} onRetry={load} /> : null}
      {loading && rows.length === 0 ? <Loading text="Loading queue" /> : null}
      {!loading && !error && rows.length === 0 ? <Empty title="Nothing here" text={status === 'pending_review' ? 'No products are waiting for review.' : 'No products in this list.'} /> : null}

      <ul className={`space-y-3 ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
        {rows.map((p) => (
          <li key={p.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-card">
            <div className="flex flex-wrap gap-4">
              {p.image_url ? <img src={imageSrc(p.image_url)} alt="" className="h-20 w-20 flex-shrink-0 rounded-lg object-cover" /> : <span className="h-20 w-20 flex-shrink-0 rounded-lg bg-gray-100" />}
              <div className="min-w-0 flex-1 basis-60">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="break-words font-semibold text-gray-900">{p.name}</p>
                  <StatusBadge status={p.approval_status} />
                </div>
                <p className="text-sm text-gray-500">
                  by <Link to={`/admin/sellers/${p.seller_id}`} className="font-medium text-primary hover:underline">{p.seller_name}</Link> · {p.category_name || 'No category'} · submitted {formatDate(p.submitted_on)}
                </p>
                <p className="mt-1 text-sm font-semibold">{money(p.discount_price ?? p.price)}{p.discount_price != null ? <span className="ml-2 font-normal text-gray-400 line-through">{money(p.price)}</span> : null} <span className="font-normal text-gray-500">· stock {p.stock_quantity} · SKU {p.sku || '—'}</span></p>
                {p.description ? <p className="mt-2 line-clamp-3 break-words text-sm text-gray-600">{p.description}</p> : null}
                {p.rejection_reason ? <p className="mt-2 rounded-md bg-rose-50 p-2 text-xs text-rose-700">Rejected: {p.rejection_reason}</p> : null}
                {p.images.length > 1 ? (
                  <div className="mt-2 flex gap-2 overflow-x-auto">
                    {p.images.slice(0, 6).map((img) => (
                      <button key={img} type="button" onClick={() => setPreview(img)} aria-label="View image larger" className="flex-shrink-0">
                        <img src={imageSrc(img)} alt="" className="h-12 w-12 rounded-md object-cover" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              {p.approval_status === 'pending_review' ? (
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:justify-center">
                  <Button busy={busyId === p.id} onClick={() => approve(p)}>Approve</Button>
                  <Button variant="danger" onClick={() => setRejecting(p)}>Reject</Button>
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <Pagination pagination={pagination} onPage={(next) => setFilters({ page: next })} />

      <ConfirmDialog
        open={Boolean(rejecting)}
        danger
        requireReason
        reasonLabel="Reason shown to the seller"
        title="Reject this product?"
        message={rejecting ? `"${rejecting.name}" stays hidden. The seller sees your reason and can edit and resubmit.` : ''}
        confirmLabel="Reject product"
        onClose={() => setRejecting(null)}
        onConfirm={async (reason) => {
          await adminSellerService.rejectProduct(rejecting.id, reason);
          addToast('Product rejected.');
          setRejecting(null);
          load();
        }}
      />

      {preview ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={() => setPreview(null)} role="dialog" aria-modal="true" aria-label="Image preview">
          <img src={imageSrc(preview)} alt="Product" className="max-h-full max-w-full rounded-lg" />
        </div>
      ) : null}
    </div>
  );
};

export default AdminProductReview;
