import React, { useState } from 'react';
import { Button, apiError, formatDateTime, imageSrc } from './ui';

const ROLE = { customer: 'Customer', seller: 'Seller', admin: 'AHM Mart' };
const ROLE_STYLE = {
  customer: 'bg-gray-50 border-gray-100',
  seller: 'bg-primary-50 border-primary-100',
  admin: 'bg-amber-50 border-amber-100',
};

export const REASON_LABEL = {
  damaged: 'Arrived damaged', defective: 'Defective / not working', wrong_item: 'Wrong item received', not_as_described: 'Not as described', other: 'Other',
};

/** Shared message thread used by the customer, seller and admin return screens. */
const ReturnThread = ({ messages, canReply, onSend, closedText = 'This return is closed.' }) => {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const send = async (event) => {
    event.preventDefault();
    if (busy || text.trim().length < 2) return;
    setBusy(true);
    setError('');
    try {
      await onSend(text.trim());
      setText('');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {messages.length === 0 ? <p className="text-sm text-gray-500">No messages yet.</p> : (
        <ul className="space-y-2">
          {messages.map((m) => (
            <li key={m.id} className={`rounded-lg border p-3 text-sm ${ROLE_STYLE[m.role]}`}>
              <div className="flex justify-between gap-2 text-xs text-gray-500"><strong className="text-gray-700">{ROLE[m.role]}</strong><span>{formatDateTime(m.created_at)}</span></div>
              <p className="mt-1 whitespace-pre-line break-words text-gray-800">{m.body}</p>
            </li>
          ))}
        </ul>
      )}
      {canReply ? (
        <form onSubmit={send} className="mt-3 space-y-2">
          <label className="sr-only" htmlFor="return-reply">Reply</label>
          <textarea id="return-reply" rows={3} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} className="input-field" placeholder="Write a reply" />
          {error ? <p role="alert" className="text-sm text-rose-600">{error}</p> : null}
          <Button type="submit" busy={busy} disabled={text.trim().length < 2}>Send reply</Button>
        </form>
      ) : <p className="mt-3 text-xs text-gray-400">{closedText}</p>}
    </div>
  );
};

export const EvidenceGallery = ({ images }) => (images?.length ? (
  <div className="flex flex-wrap gap-2">
    {images.map((path) => (
      <a key={path} href={imageSrc(path)} target="_blank" rel="noreferrer" aria-label="Open evidence photo">
        <img src={imageSrc(path)} alt="Evidence" className="h-20 w-20 rounded-lg object-cover" />
      </a>
    ))}
  </div>
) : <p className="text-sm text-gray-500">No photos attached.</p>);

export default ReturnThread;
