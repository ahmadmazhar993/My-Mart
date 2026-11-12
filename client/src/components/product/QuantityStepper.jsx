import React from 'react';
import { Minus, Plus } from 'lucide-react';

const SIZES = {
  lg: { box: 'h-12', button: 'h-12 w-12', value: 'min-w-[2.5rem] text-base' }, // product page
  md: { box: 'h-11', button: 'h-11 w-11', value: 'min-w-[2rem] text-sm' }, // cart and checkout rows (44px targets)
};

const buttonBase = 'flex items-center justify-center text-gray-700 transition-colors hover:bg-gray-50 active:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent';

// 44-48px touch targets. Limits (stock, what is already in the cart) are enforced by the caller.
const QuantityStepper = ({ value, onDecrease, onIncrease, disableDecrease = false, disableIncrease = false, size = 'lg' }) => {
  const s = SIZES[size] || SIZES.lg;
  return (
    <div className={`inline-flex ${s.box} items-center overflow-hidden rounded-xl border border-gray-300 bg-white`} role="group" aria-label="Quantity">
      <button type="button" aria-label="Decrease quantity" onClick={onDecrease} disabled={disableDecrease} className={`${buttonBase} ${s.button}`}>
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className={`${s.value} text-center font-semibold tabular-nums text-gray-900`} aria-live="polite">{value}</span>
      <button type="button" aria-label="Increase quantity" onClick={onIncrease} disabled={disableIncrease} className={`${buttonBase} ${s.button}`}>
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
};

export default QuantityStepper;
