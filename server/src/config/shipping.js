// Server-side shipping rules. Keep in sync with client/src/config/shipping.js.
const SHIPPING_TIERS = [
  { minSubtotal: 2000, cost: 0 },
  { minSubtotal: 1000, cost: 150 },
  { minSubtotal: 500, cost: 250 },
  { minSubtotal: 0, cost: 350 },
];

const getShippingCost = (subtotal) => {
  const tier = SHIPPING_TIERS.find((t) => subtotal >= t.minSubtotal);
  return tier ? tier.cost : 0;
};

module.exports = { SHIPPING_TIERS, getShippingCost };
