import { SHIPPING_TIERS } from '../config/shipping';
import { POLICY } from '../config/policies';

// Schema.org shipping / return-policy data for Product offers.
// Everything is derived from the same config that drives checkout and the published
// /pages/shipping and /pages/returns-refunds pages, so it cannot drift from them. A value that is
// null/unknown in config is simply left out: nothing is guessed.

const CURRENCY = 'PKR';
const COUNTRY = 'PK';
const SITE = 'https://ahmmart.store';

// "1–3 working days" -> { minValue: 1, maxValue: 3 }; "2 days" -> { value: 2 }; otherwise null.
const parseDayRange = (text) => {
  const match = String(text || '').match(/(\d+)\s*(?:[–—-]|to)\s*(\d+)/i);
  if (match) return { minValue: Number(match[1]), maxValue: Number(match[2]) };
  const single = String(text || '').match(/(\d+)/);
  return single ? { value: Number(single[1]) } : null;
};

// Accepts a positive number of days (7) or { min, max }; anything else (null, 0, wrong shape) is ignored
// so a half-filled config can never emit an empty QuantitativeValue.
const toDayQuantity = (input) => {
  const base = { '@type': 'QuantitativeValue', unitCode: 'DAY' };
  if (typeof input === 'number' && Number.isFinite(input) && input > 0) return { ...base, value: input };
  if (input && typeof input === 'object' && Number.isFinite(input.min) && Number.isFinite(input.max)) {
    return { ...base, minValue: input.min, maxValue: input.max };
  }
  return undefined;
};

// One OfferShippingDetails per delivery-charge tier (charges depend on the cart subtotal, exactly as
// checkout and the shipping page state). Delivery is limited to the cities in DELIVERY_CITIES, but
// schema.org cannot express a city, so the destination is declared at country level.
export const buildShippingDetails = () => {
  const days = parseDayRange(POLICY.deliveryTimeframe);
  const deliveryTime = days
    ? {
      '@type': 'ShippingDeliveryTime',
      // The published figure is the overall delivery estimate, so it is given as transit time.
      handlingTime: toDayQuantity(POLICY.handlingDays),
      transitTime: { '@type': 'QuantitativeValue', unitCode: 'DAY', ...days },
    }
    : undefined;

  const asc = [...SHIPPING_TIERS].sort((a, b) => a.minSubtotal - b.minSubtotal);
  return asc.map((tier, i) => {
    const next = asc[i + 1];
    return {
      '@type': 'OfferShippingDetails',
      shippingRate: { '@type': 'MonetaryAmount', value: Number(tier.cost).toFixed(2), currency: CURRENCY },
      shippingDestination: { '@type': 'DefinedRegion', addressCountry: COUNTRY },
      shippingConditions: {
        '@type': 'ShippingConditions',
        orderValue: {
          '@type': 'MonetaryAmount',
          minValue: tier.minSubtotal,
          ...(next ? { maxValue: next.minSubtotal - 1 } : {}),
          currency: CURRENCY,
        },
      },
      deliveryTime,
    };
  });
};

// Only emitted when a return window is actually published (POLICY.returnWindowDays). Return fees,
// method and refund type are not stated anywhere on the site, so they are not declared.
export const buildReturnPolicy = () => {
  if (!POLICY.returnWindowDays) return undefined;
  return {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: COUNTRY,
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: Number(POLICY.returnWindowDays),
    returnMethod: POLICY.returnMethod ? `https://schema.org/${POLICY.returnMethod}` : undefined,
    returnFees: POLICY.returnFees ? `https://schema.org/${POLICY.returnFees}` : undefined,
    merchantReturnLink: `${SITE}/pages/returns-refunds`,
  };
};
