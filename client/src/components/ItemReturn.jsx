import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { returnService } from '../services';
import { useToast } from './ToastProvider';
import { REASON_LABEL } from './seller/ReturnThread';
import { imageSrc } from './seller/ui';
import { Select } from './seller/filters';

const STATUS_TEXT = {
  requested: 'Return requested — awaiting review', approved: 'Return approved', received: 'Return received — refund pending',
  refunded: 'Refunded', rejected: 'Return rejected', cancelled: 'Return cancelled',
};

const ReturnDialog = ({ order, item, remaining, onClose, onCreated }) => {
  const { addToast } = useToast();
  const fileRef = useRef(null);
  const [form, setForm] = useState({ quantity: 1, reason: '', details: '' });
  const [evidence, setEvidence] = useState([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const pick = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    if (evidence.length + files.length > 5) { setError('You can attach up to 5 photos.'); return; }
    setUploading(true);
    setError('');
    try {
      const res = await returnService.uploadEvidence(files);
      setEvidence((current) => [...current, ...res.data.data]);
    } catch (err) {
      setError(err.response?.data?.message || 'Photo upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (!form.reason) { setError('Please choose a reason.'); return; }
    setBusy(true);
    setError('');
    try {
      await returnService.create({
        order_item_id: item.id, quantity: Number(form.quantity), reason: form.reason, details: form.details.trim(), evidence,
      });
      addToast('Return request sent. We will review it shortly.');
      onCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send your request.');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onMouseDown={() => !busy && onClose()}>
      <form
        onSubmit={submit}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="return-title"
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
      >
        <h3 id="return-title" className="text-lg font-bold text-dark">Request a return</h3>
        <p className="mt-1 text-sm text-gray-600">{item.product_name} · order #{order.display_order_id || order.id}</p>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="r-qty" className="mb-1 block text-sm font-medium text-gray-700">Quantity to return</label>
            <Select id="r-qty" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })}>
              {Array.from({ length: remaining }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          </div>
          <div>
            <label htmlFor="r-reason" className="mb-1 block text-sm font-medium text-gray-700">Reason *</label>
            <Select id="r-reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
              <option value="">Select a reason</option>
              {Object.entries(REASON_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </div>
          <div>
            <label htmlFor="r-details" className="mb-1 block text-sm font-medium text-gray-700">What happened?</label>
            <textarea id="r-details" rows={3} maxLength={1000} className="input-field" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-gray-700">Photos (optional, up to 5)</p>
            <div className="flex flex-wrap gap-2">
              {evidence.map((path) => (
                <span key={path} className="relative">
                  <img src={imageSrc(path)} alt="Attached" className="h-16 w-16 rounded-lg object-cover" />
                  <button type="button" aria-label="Remove photo" onClick={() => setEvidence(evidence.filter((p) => p !== path))} className="absolute -right-1 -top-1 h-6 w-6 rounded-full bg-black/70 text-xs text-white">✕</button>
                </span>
              ))}
              {evidence.length < 5 ? (
                <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-xs text-gray-500 disabled:opacity-60">
                  {uploading ? '…' : '+ Add'}
                </button>
              ) : null}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={pick} aria-label="Attach photos" />
          </div>
          {error ? <p role="alert" className="text-sm font-medium text-rose-600">{error}</p> : null}
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={busy} className="btn-outline min-h-[44px] !px-4 !py-2.5 text-sm">Cancel</button>
          <button type="submit" disabled={busy || uploading} aria-busy={busy} className="btn-primary min-h-[44px] !px-4 !py-2.5 text-sm disabled:opacity-60">{busy ? 'Sending…' : 'Send request'}</button>
        </div>
      </form>
    </div>
  );
};

/** Return status / "Request return" action for one delivered order item. */
const ItemReturn = ({ order, item, returns, onChange }) => {
  const [open, setOpen] = useState(false);
  if (order.status !== 'delivered') return null;

  const mine = returns.filter((r) => r.order_item_id === item.id);
  const holding = mine.filter((r) => ['requested', 'approved', 'received', 'refunded'].includes(r.status));
  const remaining = Number(item.quantity) - holding.reduce((sum, r) => sum + r.quantity, 0);

  return (
    <div className="mt-2 space-y-1 text-sm">
      {mine.map((r) => (
        <p key={r.id} className="text-gray-600">
          <Link to={`/returns?open=${r.id}`} className="font-medium text-primary hover:underline">{STATUS_TEXT[r.status]}</Link>
          {` · ${r.quantity} item(s)`}{r.status === 'refunded' && r.refund_amount != null ? ` · Rs. ${Number(r.refund_amount).toLocaleString()}` : ''}
        </p>
      ))}
      {remaining > 0 ? (
        <button type="button" onClick={() => setOpen(true)} className="rounded-full bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-200 transition hover:bg-gray-100">
          Request return
        </button>
      ) : null}
      {open ? <ReturnDialog order={order} item={item} remaining={remaining} onClose={() => setOpen(false)} onCreated={onChange} /> : null}
    </div>
  );
};

export default ItemReturn;
