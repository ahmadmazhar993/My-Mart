/**
 * Decimal-safe money helpers. Amounts are handled as integer paisa (1/100 Rs.)
 * so no floating-point rounding can leak into financial records.
 */

// Accepts numbers or numeric strings (pg returns NUMERIC as strings).
const toCents = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`Invalid money value: ${value}`);
  return Math.round(number * 100);
};

// Returns a fixed 2-decimal string, which pg stores in NUMERIC exactly.
const fromCents = (cents) => {
  if (!Number.isInteger(cents)) throw new TypeError(`Cents must be an integer: ${cents}`);
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
};

const toMoneyNumber = (value) => Number(value || 0);

// commission = round(base * rate), rate given in basis points (500 = 5%). Half-up.
const commissionCents = (baseCents, rateBps) => Math.round((baseCents * rateBps) / 10000);

// Proportional share, rounded half-up, e.g. part of `total` for `numerator/denominator`.
const proportionalCents = (totalCents, numerator, denominator) => (
  denominator === 0 ? 0 : Math.round((totalCents * numerator) / denominator)
);

module.exports = {
  toCents, fromCents, toMoneyNumber, commissionCents, proportionalCents,
};
