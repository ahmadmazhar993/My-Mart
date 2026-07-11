export function formatPrice(price) {
  if (price == null || Number.isNaN(Number(price))) return 'Rs. 0';
  return `Rs. ${Number(price).toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function getDiscountPercent(price, discountPrice) {
  if (!price || !discountPrice || discountPrice >= price) return null;
  return Math.round(((price - discountPrice) / price) * 100);
}

export function getEffectivePrice(product) {
  return product.discount_price ?? product.price;
}
