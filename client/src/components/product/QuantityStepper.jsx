import React from 'react';
import { Minus, Plus } from 'lucide-react';

const buttonClass = 'flex h-12 w-12 items-center justify-center text-gray-700 transition-colors hover:bg-gray-50 active:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent';

// 48px touch targets. Limits (stock, what is already in the cart) are enforced by the caller.
const QuantityStepper = ({ value, onDecrease, onIncrease, disableDecrease = false, disableIncrease = false }) => (
  <div className="inline-flex h-12 items-center overflow-hidden rounded-xl border border-gray-300 bg-white" role="group" aria-label="Quantity">
    <button type="button" aria-label="Decrease quantity" onClick={onDecrease} disabled={disableDecrease} className={buttonClass}>
      <Minus className="h-4 w-4" aria-hidden="true" />
    </button>
    <span className="min-w-[2.5rem] text-center text-base font-semibold tabular-nums text-gray-900" aria-live="polite">{value}</span>
    <button type="button" aria-label="Increase quantity" onClick={onIncrease} disabled={disableIncrease} className={buttonClass}>
      <Plus className="h-4 w-4" aria-hidden="true" />
    </button>
  </div>
);

export default QuantityStepper;
