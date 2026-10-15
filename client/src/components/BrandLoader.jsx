import React from 'react';

// The AHM Mart brand mark (public/logo.png). To use a different mark, change this one path.
const BRAND_MARK_SRC = '/logo.png';

const SIZES = { xs: 16, sm: 32, md: 56, lg: 80 };

// Branded loading indicator: the AHM Mart mark rotating with a pure-CSS animation.
// (Under `prefers-reduced-motion` the global rule in index.css stops the rotation.)
//
//   variant="inline"  (default) centered block for sections / lists; reserves `minHeight`
//                     so content does not jump when it arrives.
//   variant="page"    full-screen overlay for app / route loading.
//   variant="button"  small mark for use inside a button next to its own label.
//
// Use tone="light" for a white mark on brand-colored backgrounds (buttons are light by default).
const BrandLoader = ({
  variant = 'inline',
  size,
  text,
  tone,
  minHeight = 240,
  label = 'Loading',
  className = '',
}) => {
  const isButton = variant === 'button';
  const px = typeof size === 'number' ? size : SIZES[size || (isButton ? 'xs' : variant === 'page' ? 'lg' : 'md')];
  const light = (tone || (isButton ? 'light' : 'brand')) === 'light';

  const mark = (
    <img
      src={BRAND_MARK_SRC}
      alt=""
      aria-hidden="true"
      width={px}
      height={px}
      draggable={false}
      decoding="async"
      style={{ width: px, height: px, willChange: 'transform' }}
      className={`flex-shrink-0 animate-brand-spin object-contain ${light ? 'brightness-0 invert' : ''}`}
    />
  );

  // Inside a button the button's own text ("Placing order...") is the accessible label.
  if (isButton) return <span className={`inline-flex ${className}`} aria-hidden="true">{mark}</span>;

  const body = (
    <>
      {mark}
      {text ? <p className="mt-3 text-sm font-medium text-gray-600">{text}</p> : null}
      <span className="sr-only">{text || label}</span>
    </>
  );

  if (variant === 'page') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`fixed inset-0 z-[70] flex animate-fade-in flex-col items-center justify-center bg-surface px-6 text-center ${className}`}
      >
        {body}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{ minHeight }}
      className={`flex w-full animate-fade-in flex-col items-center justify-center px-4 py-6 text-center ${className}`}
    >
      {body}
    </div>
  );
};

export default BrandLoader;
