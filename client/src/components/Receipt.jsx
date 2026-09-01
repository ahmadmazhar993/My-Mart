import React, { forwardRef } from 'react';
import QRCode from 'react-qr-code';
import { formatPrice } from '../utils/format';

// Receipt visual component. Forward ref so parent can render and capture as PDF.
const Receipt = forwardRef(({ data, martInfo = {} }, ref) => {
    const { order, receipt } = data || {};
    const invoice = receipt?.invoice_number || order?.invoice_number || null;
    const subtotal =
        order?.subtotal ??
        (order?.total_price ? order.total_price - (order.shipping_cost || 0) : 0);
    const shipping = order?.shippingCost || order?.shipping_cost || 0;
    const grandTotal = order?.totalPrice || order?.total_price || 0;
    const paymentMethod = order?.paymentMethod || order?.payment_method || '—';
    const paymentStatus = order?.paymentStatus || order?.payment_status || '—';

    const statusColors = {
        paid: { bg: '#ECFDF5', text: '#047857', dot: '#10B981' },
        completed: { bg: '#ECFDF5', text: '#047857', dot: '#10B981' },
        pending: { bg: '#FFFBEB', text: '#B45309', dot: '#F59E0B' },
        failed: { bg: '#FEF2F2', text: '#B91C1C', dot: '#EF4444' },
    };
    const statusStyle =
        statusColors[String(paymentStatus).toLowerCase()] || {
            bg: '#F3F4F6',
            text: '#374151',
            dot: '#9CA3AF',
        };

    return (
        <div
            ref={ref}
            className="receipt-root bg-white text-gray-900"
            style={{
                fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
                width: '100%',
                maxWidth: 720,
                margin: '0 auto',
                border: '1px solid #E5E7EB',
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
        >
            {/* Accent top strip */}
            <div style={{ height: 6, background: 'linear-gradient(90deg,#4F46E5,#7C3AED)' }} />

            {/* Header */}
            <div style={{ padding: '28px 32px 20px' }}>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        {martInfo.logoUrl ? (
                            <img
                                src={martInfo.logoUrl}
                                alt="logo"
                                style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 10 }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 10,
                                    background: '#EEF2FF',
                                    color: '#4F46E5',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: 20,
                                }}
                            >
                                {(martInfo.name || 'M')[0].toUpperCase()}
                            </div>
                        )}
                        <div>
                            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>
                                {martInfo.name || 'My Mart'}
                            </div>
                            <div style={{ fontSize: 12.5, color: '#6B7280', marginTop: 2 }}>
                                {martInfo.address || ''}
                            </div>
                            <div style={{ fontSize: 12.5, color: '#6B7280' }}>
                                {martInfo.phone || ''}
                                {martInfo.email ? `  •  ${martInfo.email}` : ''}
                            </div>
                        </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                        <div
                            style={{
                                display: 'inline-block',
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                color: '#4F46E5',
                                background: '#EEF2FF',
                                padding: '4px 10px',
                                borderRadius: 999,
                                textTransform: 'uppercase',
                            }}
                        >
                            Receipt
                        </div>
                        <div style={{ fontSize: 12.5, color: '#6B7280', marginTop: 10, lineHeight: 1.4, width: 190, textAlign: 'right' }}>
                            <div style={{ fontSize: 11, color: '#6B7280' }}>Invoice</div>
                            <div
                                style={{
                                    color: '#111827',
                                    fontWeight: 700,
                                    fontSize: 12.5,
                                    wordBreak: 'break-all',
                                    whiteSpace: 'normal',
                                }}
                            >
                                {invoice || '—'}
                            </div>
                            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 8 }}>Order</div>
                            <div style={{ color: '#111827', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                {order?.display_order_id || order?.orderCode || order?.orderID}
                            </div>
                            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 6 }}>
                                {new Date(order?.createdOn || order?.created_at || Date.now()).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ borderTop: '1px solid #F3F4F6' }} />

            {/* Items table */}
            <div style={{ padding: '24px 32px 0' }}>
                <div
                    style={{
                        border: '1px solid #EEF0F3',
                        borderRadius: 12,
                        overflow: 'hidden',
                    }}
                >
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                        <thead>
                            <tr style={{ background: '#FAFAFB' }}>
                                {['SKU', 'Product', 'Qty', 'Unit', 'Total'].map((h, i) => (
                                    <th
                                        key={h}
                                        style={{
                                            textAlign: i >= 3 ? 'right' : 'left',
                                            fontSize: 10.5,
                                            fontWeight: 700,
                                            letterSpacing: '0.06em',
                                            textTransform: 'uppercase',
                                            color: '#9CA3AF',
                                            padding: '12px 16px',
                                            borderBottom: '1px solid #EEF0F3',
                                        }}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {order?.items?.map((it, idx) => (
                                <tr
                                    key={it.id}
                                    style={{
                                        background: idx % 2 === 1 ? '#FCFCFD' : '#fff',
                                        borderBottom:
                                            idx === order.items.length - 1 ? 'none' : '1px solid #F3F4F6',
                                    }}
                                >
                                    <td style={{ padding: '14px 16px', fontSize: 11.5, color: '#9CA3AF', fontFamily: 'monospace' }}>
                                        {it.variant_sku || it.product_id}
                                    </td>
                                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#111827' }}>
                                        {it.product_name}
                                    </td>
                                    <td style={{ padding: '14px 16px', color: '#4B5563' }}>{it.quantity}</td>
                                    <td style={{ padding: '14px 16px', textAlign: 'right', color: '#4B5563' }}>
                                        {formatPrice(it.unit_price || it.unitPrice || 0)}
                                    </td>
                                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>
                                        {formatPrice(it.total_price || it.totalPrice || 0)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals card */}
                <div className="flex justify-end" style={{ marginTop: 24 }}>
                    <div
                        style={{
                            width: 300,
                            background: '#fff',
                            border: '1px solid #EEF0F3',
                            borderRadius: 14,
                            boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
                            overflow: 'hidden',
                        }}
                    >
                        <div style={{ padding: '18px 20px' }}>
                            <div className="flex justify-between" style={{ fontSize: 13, marginBottom: 10 }}>
                                <span style={{ color: '#6B7280' }}>Subtotal</span>
                                <span style={{ fontWeight: 600, color: '#374151' }}>{formatPrice(subtotal)}</span>
                            </div>
                            <div className="flex justify-between" style={{ fontSize: 13 }}>
                                <span style={{ color: '#6B7280' }}>Shipping</span>
                                <span style={{ fontWeight: 600, color: '#374151' }}>{formatPrice(shipping)}</span>
                            </div>
                        </div>

                        <div
                            style={{
                                background: 'linear-gradient(135deg, #F5F3FF 0%, #EEF2FF 100%)',
                                padding: '16px 20px',
                                borderTop: '1px solid #EEF0F3',
                            }}
                        >
                            <div className="flex justify-between items-center">
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Grand Total</span>
                                <span style={{ fontSize: 19, fontWeight: 800, color: '#4F46E5', letterSpacing: '-0.01em' }}>
                                    {formatPrice(grandTotal)}
                                </span>
                            </div>

                            <div
                                className="flex items-center justify-between"
                                style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #DDD6FE' }}
                            >
                                <span
                                    style={{
                                        fontSize: 11.5,
                                        fontWeight: 600,
                                        color: '#6B7280',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.04em',
                                    }}
                                >
                                    {paymentMethod}
                                </span>
                                <span
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '6px auto',
                                        alignItems: 'center',
                                        gap: 6,
                                        background: statusStyle.bg,
                                        color: statusStyle.text,
                                        fontWeight: 700,
                                        height: 24,
                                        padding: '0 11px',
                                        borderRadius: 999,
                                        fontSize: 11,
                                        textTransform: 'capitalize',
                                        border: `1px solid ${statusStyle.text}22`,
                                        width: 'fit-content',
                                    }}
                                >
                                    <span
                                        style={{
                                            width: 6,
                                            height: 6,
                                            borderRadius: '50%',
                                            background: statusStyle.dot,
                                        }}
                                    >

                                    </span>
                                    <span style={{ marginLeft: 0, lineHeight: 1.2, top: 0, position: 'relative' }}>
                                        {paymentStatus}
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Footer */}
            <div
                className="flex items-center justify-between"
                style={{
                    margin: '24px 32px 0',
                    padding: '20px 0 28px',
                    borderTop: '1px solid #F3F4F6',
                }}
            >
                <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                        Thank you for shopping with us!
                    </div>
                    <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                        Returns accepted within 7 days · Support: {martInfo.support || martInfo.email || 'support@example.com'}
                    </div>
                </div>
                <div
                    style={{
                        padding: 8,
                        background: '#fff',
                        border: '1px solid #E5E7EB',
                        borderRadius: 10,
                    }}
                >
                    {(() => {
                        const invoiceVal = invoice || order?.orderCode || order?.orderID;
                        const base = (martInfo && martInfo.website) || (typeof window !== 'undefined' && window.location.origin) || '';
                        const receiptUrl = `${base.replace(/\/$/, '')}/api/v1/receipts/public/${encodeURIComponent(invoiceVal)}`;
                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                <QRCode value={receiptUrl} size={80} />
                            </div>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
});

export default Receipt;