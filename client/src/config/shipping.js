// config/shipping.js
export const SHIPPING_TIERS = [
    { minSubtotal: 2000, cost: 0, label: 'FREE Delivery' },
    { minSubtotal: 1000, cost: 150, label: 'Rs. 150 Delivery' },
    { minSubtotal: 500, cost: 250, label: 'Rs. 250 Delivery' },
    { minSubtotal: 0, cost: 350, label: 'Rs. 350 Delivery' },
];

// Returns { cost, currentTier, nextTier, amountToNextTier }
export const getShippingInfo = (subtotal) => {
    const sorted = [...SHIPPING_TIERS].sort((a, b) => b.minSubtotal - a.minSubtotal);
    const currentTier = sorted.find((t) => subtotal >= t.minSubtotal);
    const tierIndex = sorted.indexOf(currentTier);
    const nextTier = tierIndex > 0 ? sorted[tierIndex - 1] : null;

    return {
        cost: currentTier.cost,
        currentTier,
        nextTier,
        amountToNextTier: nextTier ? Math.max(nextTier.minSubtotal - subtotal, 0) : 0,
    };
};