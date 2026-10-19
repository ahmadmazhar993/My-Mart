import React, { forwardRef } from 'react';
import QRCode from 'react-qr-code';
import { formatPrice } from '../utils/format';
import { ONLINE_PAYMENT_ACCOUNTS, PAYMENT_METHOD_LABELS } from '../config/paymentAccounts';

// Receipt visual component. Forward ref so parent can render and capture as PDF.
//
// Everything here uses inline styles only (no Tailwind classes, no CSS grid, no fixed-height
// layout tricks) so it renders identically in the app, in the standalone "View/Print" window,
// and in the html2canvas capture used for the PDF.
const BRAND = '#059669';
const BRAND_DARK = '#047857';
const BRAND_SOFT = '#ECFDF5';
const INK = '#111827';
const MUTED = '#6B7280';
const LINE = '#E5E7EB';

// Small-screen layout for the View/Print window. The PDF is captured at desktop width, so these
// rules never apply to it.
const RESPONSIVE_CSS = `
@media (max-width: 600px) {
  .receipt-root .rc-head { padding: 22px 18px 18px !important; flex-wrap: wrap; gap: 14px; }
  .receipt-root .rc-head-right { text-align: left !important; }
  .receipt-root .rc-info { margin: 0 18px !important; }
  .receipt-root .rc-info-row { flex-wrap: wrap; gap: 14px; }
  .receipt-root .rc-info-row > div { flex: 1 1 45% !important; text-align: left !important; padding-right: 0 !important; }
  .receipt-root .rc-body { padding: 20px 18px 0 !important; }
  .receipt-root .rc-tablewrap { overflow-x: auto !important; }
  .receipt-root .rc-table { min-width: 460px; }
  .receipt-root .rc-totals { width: 100% !important; }
  .receipt-root .rc-pay { margin: 22px 18px 0 !important; }
  .receipt-root .rc-pay-body { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
  .receipt-root .rc-accts { flex-direction: column !important; gap: 12px !important; }
  .receipt-root .rc-foot { margin: 22px 18px 0 !important; flex-wrap: wrap; gap: 14px; }
}
`;

const label = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#9CA3AF',
    lineHeight: 1.2,
};

const value = {
    fontSize: 13,
    fontWeight: 600,
    color: INK,
    marginTop: 5,
    lineHeight: 1.4,
};

const Receipt = forwardRef(({ data, martInfo = {} }, ref) => {
    const { order, receipt } = data || {};
    const invoice = receipt?.invoice_number || order?.invoice_number || null;
    const items = order?.items || [];
    const shipping = order?.shippingCost || order?.shipping_cost || 0;
    const grandTotal = order?.totalPrice || order?.total_price || 0;
    const subtotal = order?.subtotal ?? (grandTotal ? grandTotal - shipping : 0);
    const paymentMethodRaw = order?.paymentMethod || order?.payment_method || '—';
    const paymentMethod =
        PAYMENT_METHOD_LABELS[String(paymentMethodRaw).toLowerCase()] || paymentMethodRaw;
    const paymentStatus = order?.paymentStatus || order?.payment_status || '—';
    const orderRef = order?.display_order_id || order?.orderCode || order?.orderID || '—';
    const shipTo = order?.shipping_address || order?.shippingAddress || '—';
    const placedOn = new Date(order?.createdOn || order?.created_at || Date.now()).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });

    const statusColors = {
        paid: { bg: '#ECFDF5', text: '#047857', dot: '#10B981' },
        completed: { bg: '#ECFDF5', text: '#047857', dot: '#10B981' },
        pending: { bg: '#FFFBEB', text: '#B45309', dot: '#F59E0B' },
        unpaid: { bg: '#FFFBEB', text: '#B45309', dot: '#F59E0B' },
        refunded: { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
        failed: { bg: '#FEF2F2', text: '#B91C1C', dot: '#EF4444' },
    };
    const statusStyle =
        statusColors[String(paymentStatus).toLowerCase()] || {
            bg: '#F3F4F6',
            text: '#374151',
            dot: '#9CA3AF',
        };

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const needsPayment = ['unpaid', 'pending', 'failed'].includes(String(paymentStatus).toLowerCase());
    const qrAccount = ONLINE_PAYMENT_ACCOUNTS.find((a) => a.qrImage);

    const invoiceVal = invoice || order?.orderCode || order?.orderID;
    const base =
        (martInfo && martInfo.website) ||
        (typeof window !== 'undefined' && window.location.origin) ||
        '';
    const receiptUrl = `${base.replace(/\/$/, '')}/api/v1/receipts/public/${encodeURIComponent(invoiceVal)}`;

    return (
        <div
            ref={ref}
            className="receipt-root"
            style={{
                boxSizing: 'border-box',
                fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
                color: INK,
                background: '#FFFFFF',
                width: '100%',
                maxWidth: 720,
                margin: '0 auto',
                border: `1px solid ${LINE}`,
                borderRadius: 16,
                overflow: 'hidden',
                lineHeight: 1.4,
            }}
        >
            <style>{RESPONSIVE_CSS}</style>

            {/* Accent strip */}
            <div style={{ height: 6, background: BRAND }} />

            {/* Header: brand left, document title right */}
            <div
                className="rc-head"
                style={{ padding: '30px 36px 26px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}
            >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    {martInfo.logoUrl ? (
                        <img
                            src={martInfo.logoUrl}
                            alt="logo"
                            crossOrigin="anonymous"
                            style={{ width: 54, height: 54, objectFit: 'contain', borderRadius: 10, marginRight: 16 }}
                        />
                    ) : (
                        <div
                            style={{
                                width: 54,
                                height: 54,
                                borderRadius: 12,
                                background: BRAND_SOFT,
                                color: BRAND,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: 22,
                                marginRight: 16,
                            }}
                        >
                            {(martInfo.name || 'M')[0].toUpperCase()}
                        </div>
                    )}
                    <div>
                        <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                            {martInfo.name || 'My Mart'}
                        </div>
                        {martInfo.address && (
                            <div style={{ fontSize: 12, color: MUTED, marginTop: 4, maxWidth: 340 }}>
                                {martInfo.address}
                            </div>
                        )}
                        <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                            {martInfo.phone || ''}
                            {martInfo.email ? `  •  ${martInfo.email}` : ''}
                        </div>
                    </div>
                </div>

                <div className="rc-head-right" style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '0.14em', color: BRAND, lineHeight: 1.1 }}>
                        RECEIPT
                    </div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 6 }}>
                        {invoice ? `No. ${invoice}` : `Order ${orderRef}`}
                    </div>
                </div>
            </div>

            {/* Order details */}
            <div
                className="rc-info"
                style={{ margin: '0 36px', borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}` }}
            >
                <div className="rc-info-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0' }}>
                    <div style={{ flex: '1 1 0', minWidth: 0, paddingRight: 12 }}>
                        <div style={label}>Invoice</div>
                        <div style={{ ...value, wordBreak: 'break-all' }}>{invoice || '—'}</div>
                    </div>
                    <div style={{ flex: '1 1 0', minWidth: 0, paddingRight: 12 }}>
                        <div style={label}>Order</div>
                        <div style={{ ...value, whiteSpace: 'nowrap' }}>{orderRef}</div>
                    </div>
                    <div style={{ flex: '1 1 0', minWidth: 0 }}>
                        <div style={label}>Date</div>
                        <div style={value}>{placedOn}</div>
                    </div>
                </div>
                <div
                    className="rc-info-row"
                    style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderTop: `1px solid ${LINE}` }}
                >
                    <div style={{ flex: '2 1 0', minWidth: 0, paddingRight: 24 }}>
                        <div style={label}>Ship to</div>
                        <div style={{ ...value, fontWeight: 500, color: '#374151' }}>{shipTo}</div>
                    </div>
                    <div style={{ flex: '1 1 0', minWidth: 0 }}>
                        <div style={label}>Payment method</div>
                        <div style={value}>{paymentMethod}</div>
                    </div>
                </div>
            </div>

            {/* Items */}
            <div className="rc-body" style={{ padding: '22px 36px 0' }}>
                <div className="rc-tablewrap" style={{ overflow: 'hidden' }}>
                    <table className="rc-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                        <thead>
                            <tr>
                                {['SKU', 'Product', 'Qty', 'Unit', 'Total'].map((h, i) => (
                                    <th
                                        key={h}
                                        style={{
                                            textAlign: i >= 3 ? 'right' : i === 2 ? 'center' : 'left',
                                            fontSize: 10,
                                            fontWeight: 700,
                                            letterSpacing: '0.1em',
                                            textTransform: 'uppercase',
                                            color: '#9CA3AF',
                                            padding: '0 12px 10px',
                                            borderBottom: `2px solid ${INK}`,
                                        }}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((it, idx) => (
                                <tr key={it.id ?? idx} style={{ borderBottom: `1px solid ${LINE}` }}>
                                    <td style={{ padding: '14px 12px', fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' }}>
                                        {it.variant_sku || it.product_id}
                                    </td>
                                    <td style={{ padding: '14px 12px', fontWeight: 600, color: INK }}>
                                        {it.product_name}
                                    </td>
                                    <td style={{ padding: '14px 12px', textAlign: 'center', color: '#4B5563' }}>{it.quantity}</td>
                                    <td style={{ padding: '14px 12px', textAlign: 'right', color: '#4B5563', whiteSpace: 'nowrap' }}>
                                        {formatPrice(it.unit_price || it.unitPrice || 0)}
                                    </td>
                                    <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 700, color: INK, whiteSpace: 'nowrap' }}>
                                        {formatPrice(it.total_price || it.totalPrice || 0)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals — plain rows, one highlighted grand total */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                    <div className="rc-totals" style={{ width: 300 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 12px' }}>
                            <span style={{ color: MUTED }}>Subtotal</span>
                            <span style={{ fontWeight: 600, color: '#374151' }}>{formatPrice(subtotal)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 12px' }}>
                            <span style={{ color: MUTED }}>Shipping</span>
                            <span style={{ fontWeight: 600, color: '#374151' }}>{formatPrice(shipping)}</span>
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: BRAND_SOFT,
                                borderRadius: 10,
                                padding: '14px 12px',
                                marginTop: 8,
                            }}
                        >
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Grand Total</span>
                            <span style={{ fontSize: 20, fontWeight: 800, color: BRAND_DARK, letterSpacing: '-0.01em' }}>
                                {formatPrice(grandTotal)}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 0' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9CA3AF' }}>
                                Payment status
                            </span>
                            <span
                                style={{
                                    display: 'inline-block',
                                    background: statusStyle.bg,
                                    color: statusStyle.text,
                                    fontWeight: 700,
                                    fontSize: 11,
                                    lineHeight: '24px',
                                    height: 24,
                                    padding: '0 12px',
                                    borderRadius: 999,
                                    textTransform: 'capitalize',
                                    border: `1px solid ${statusStyle.dot}55`,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                <span
                                    className="pdf-nudge"
                                    data-nudge="2.5"
                                    style={{
                                        display: 'inline-block',
                                        width: 6,
                                        height: 6,
                                        borderRadius: '50%',
                                        background: statusStyle.dot,
                                        marginRight: 6,
                                        verticalAlign: 'middle',
                                    }}
                                />
                                <span className="pdf-nudge" data-nudge="9.5" style={{ verticalAlign: 'middle' }}>{paymentStatus}</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment instructions — every unpaid order */}
            {needsPayment && (
                <div
                    className="rc-pay"
                    style={{
                        margin: '26px 36px 0',
                        padding: '18px 20px',
                        background: '#FFFBEB',
                        border: '1px solid #FDE68A',
                        borderLeft: '4px solid #F59E0B',
                        borderRadius: 10,
                    }}
                >
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#92400E' }}>How to pay</div>
                    <div style={{ fontSize: 12, color: '#78350F', marginTop: 3 }}>
                        Transfer {formatPrice(grandTotal)} to one of the accounts below, then send the payment proof to support.
                    </div>

                    <div className="rc-pay-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, marginTop: 14 }}>
                        <div className="rc-accts" style={{ display: 'flex', gap: 28, flex: '1 1 0', minWidth: 0 }}>
                            {ONLINE_PAYMENT_ACCOUNTS.map((acc) => (
                                <div key={acc.type} style={{ fontSize: 12, lineHeight: 1.6, minWidth: 0 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#B45309', marginBottom: 2 }}>
                                        {acc.type === 'Bank' ? acc.provider : acc.type}
                                    </div>
                                    <div style={{ fontWeight: 700, color: INK, fontSize: 13 }}>{acc.account}</div>
                                    <div style={{ color: '#4B5563' }}>{acc.accountHolder}</div>
                                </div>
                            ))}
                        </div>

                        {qrAccount && (
                            <div style={{ flex: '0 0 auto', textAlign: 'center' }}>
                                <div style={{ padding: 6, background: '#FFFFFF', border: '1px solid #FDE68A', borderRadius: 8, lineHeight: 0 }}>
                                    <img
                                        src={`${origin}${qrAccount.qrImage}`}
                                        alt="Bank payment QR"
                                        crossOrigin="anonymous"
                                        style={{ width: 96, height: 96, objectFit: 'contain' }}
                                    />
                                </div>
                                <div style={{ fontSize: 10, color: '#78350F', marginTop: 5 }}>Scan to pay</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Footer */}
            <div
                className="rc-foot"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    margin: '28px 36px 0',
                    padding: '20px 0 28px',
                    borderTop: `1px solid ${LINE}`,
                }}
            >
                <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>Thank you for shopping with us!</div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>
                        Returns accepted within 7 days · Support: {martInfo.support || martInfo.email || 'support@example.com'}
                    </div>
                </div>
                <div style={{ textAlign: 'center', flex: '0 0 auto' }}>
                    <div style={{ padding: 6, background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: 8, lineHeight: 0 }}>
                        <QRCode value={receiptUrl} size={64} />
                    </div>
                    <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 5 }}>Scan to verify</div>
                </div>
            </div>
        </div>
    );
});

export default Receipt;
