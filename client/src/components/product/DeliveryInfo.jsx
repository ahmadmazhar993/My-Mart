import React from 'react';
import { Link } from 'react-router-dom';
import { Truck, Banknote, RotateCcw, ChevronRight } from 'lucide-react';
import { SHIPPING_TIERS } from '../../config/shipping';
import { DELIVERY_CITIES, POLICY } from '../../config/policies';
import { PAYMENT_METHOD_LABELS } from '../../config/paymentAccounts';

const pkr = (n) => `Rs. ${Number(n).toLocaleString('en-PK')}`;

// Compact delivery / payment / returns summary. Every figure comes from the same config the
// checkout and the Shipping, Payments and Returns pages use, and a detail is only shown when the
// business has published it, so nothing here can promise more than those pages do.
const buildRows = () => {
  const rows = [];

  const paid = SHIPPING_TIERS.filter((t) => t.cost > 0).map((t) => t.cost);
  const freeFrom = SHIPPING_TIERS.find((t) => t.cost === 0)?.minSubtotal;
  const timing = [
    POLICY.handlingDays?.max != null ? `dispatched within ${POLICY.handlingDays.max} day${POLICY.handlingDays.max === 1 ? '' : 's'}` : null,
    POLICY.deliveryTimeframe ? `delivery usually ${POLICY.deliveryTimeframe}` : null,
  ].filter(Boolean).join(', then ');
  const charges = paid.length
    ? `Delivery ${pkr(Math.min(...paid))}–${pkr(Math.max(...paid))}${freeFrom ? `, free on orders of ${pkr(freeFrom)}+` : ''}`
    : null;
  rows.push({
    key: 'delivery',
    Icon: Truck,
    title: `Delivery in ${DELIVERY_CITIES.join(', ')}`,
    text: [timing && timing.charAt(0).toUpperCase() + timing.slice(1), charges].filter(Boolean).join('. '),
    to: '/pages/shipping',
    label: 'Shipping & delivery details',
  });

  rows.push({
    key: 'payment',
    Icon: Banknote,
    title: 'Payment options',
    text: `${PAYMENT_METHOD_LABELS.cod}, or ${PAYMENT_METHOD_LABELS.online.toLowerCase()} by bank transfer or Easypaisa`,
    to: '/pages/cash-on-delivery',
    label: 'Payment details',
  });

  if (POLICY.returnWindowDays) {
    rows.push({
      key: 'returns',
      Icon: RotateCcw,
      title: `${POLICY.returnWindowDays}-day return window`,
      text: 'Conditions apply; some products may not be returnable.',
      to: '/pages/returns-refunds',
      label: 'Returns & refunds policy',
    });
  }
  return rows;
};

const DeliveryInfo = () => {
  const rows = buildRows();
  return (
    <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white" aria-label="Delivery, payment and returns">
      {rows.map(({ key, Icon, title, text, to, label }) => (
        <li key={key}>
          <Link
            to={to}
            aria-label={`${title}. ${label}`}
            className="group flex min-h-[56px] items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
          >
            <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700">
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-gray-900">{title}</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-gray-600">{text}</span>
            </span>
            <ChevronRight className="mt-2 h-4 w-4 flex-shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default DeliveryInfo;

// Full wording for the "Shipping & returns" accordion section (same sources as the summary above).
export const ShippingReturnsDetails = () => {
  const tiers = [...SHIPPING_TIERS].sort((a, b) => a.minSubtotal - b.minSubtotal);
  return (
    <div className="space-y-4">
      <div>
        <p className="font-semibold text-gray-900">Delivery</p>
        <p className="mt-1">
          Checkout currently accepts delivery addresses in {DELIVERY_CITIES.join(', ')}.
          {POLICY.handlingDays?.max != null && ` Orders are usually dispatched within ${POLICY.handlingDays.max} day${POLICY.handlingDays.max === 1 ? '' : 's'}.`}
          {POLICY.deliveryTimeframe && ` Delivery then usually takes ${POLICY.deliveryTimeframe}.`}
        </p>
        <ul className="mt-2 space-y-1">
          {tiers.map((tier, i) => {
            const next = tiers[i + 1];
            const range = !next ? `${pkr(tier.minSubtotal)} and above` : i === 0 ? `Below ${pkr(next.minSubtotal)}` : `${pkr(tier.minSubtotal)} to ${pkr(next.minSubtotal - 1)}`;
            return <li key={tier.minSubtotal}>{range}: <span className="font-medium text-gray-900">{tier.cost === 0 ? 'Free delivery' : pkr(tier.cost)}</span></li>;
          })}
        </ul>
      </div>
      {POLICY.returnWindowDays && (
        <div>
          <p className="font-semibold text-gray-900">Returns</p>
          <p className="mt-1">Returns must be requested within {POLICY.returnWindowDays} days of delivery. Some products, such as perishable groceries or personal-care items, may not be returnable unless they arrive damaged or defective.</p>
        </div>
      )}
      <p className="flex flex-wrap gap-x-4 gap-y-1 font-medium">
        <Link to="/pages/shipping" className="text-primary-700 underline-offset-2 hover:underline">Shipping &amp; delivery</Link>
        <Link to="/pages/returns-refunds" className="text-primary-700 underline-offset-2 hover:underline">Returns &amp; refunds</Link>
        <Link to="/pages/digital-payments" className="text-primary-700 underline-offset-2 hover:underline">Payments</Link>
      </p>
    </div>
  );
};
