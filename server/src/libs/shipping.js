/**
 * Delivery pricing and coverage, enforced on the server.
 * Keep in step with client/src/config/shipping.js and client/src/config/policies.js (the checkout
 * shows these numbers; the server is what actually charges them, so a browser can never choose its
 * own delivery fee).
 */
const SHIPPING_TIERS = [
  { minSubtotal: 2000, cost: 0 },
  { minSubtotal: 1000, cost: 150 },
  { minSubtotal: 500, cost: 250 },
  { minSubtotal: 0, cost: 350 },
];

const DELIVERY_CITIES = ['Lahore'];

// Delivery charge for a product subtotal (in Rs.), highest matching tier wins.
const shippingCostFor = (subtotal) => {
  const tier = [...SHIPPING_TIERS].sort((a, b) => b.minSubtotal - a.minSubtotal).find((t) => subtotal >= t.minSubtotal);
  return tier ? tier.cost : SHIPPING_TIERS[SHIPPING_TIERS.length - 1].cost;
};

// The checkout stores "name, phone, address, city": the city is the last comma-separated part.
const cityOfAddress = (shippingAddress) => String(shippingAddress || '').split(',').pop().trim();

const isDeliverableAddress = (shippingAddress) => {
  const city = cityOfAddress(shippingAddress).toLowerCase();
  return DELIVERY_CITIES.some((allowed) => allowed.toLowerCase() === city);
};

module.exports = {
  SHIPPING_TIERS, DELIVERY_CITIES, shippingCostFor, cityOfAddress, isDeliverableAddress,
};
