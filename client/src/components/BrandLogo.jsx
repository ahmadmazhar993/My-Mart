import React, { useState } from 'react';
import { normalizeProductImageUrl } from '../utils/product';

// Soft badge colours so each brand without a logo gets a stable, distinct monogram.
const BADGE_STYLES = [
  'bg-emerald-50 text-emerald-700 ring-emerald-100',
  'bg-blue-50 text-blue-700 ring-blue-100',
  'bg-amber-50 text-amber-700 ring-amber-100',
  'bg-rose-50 text-rose-700 ring-rose-100',
  'bg-violet-50 text-violet-700 ring-violet-100',
  'bg-cyan-50 text-cyan-700 ring-cyan-100',
];

const badgeFor = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 997;
  return BADGE_STYLES[hash % BADGE_STYLES.length];
};

// Brand logo on a white tile, falling back to a coloured monogram when there is no logo
// (or it fails to load). `className` controls the size/shape, e.g. "h-12 w-12 rounded-xl".
const BrandLogo = ({ brand, className = 'h-12 w-12 rounded-xl', textClass = 'text-lg' }) => {
  const [failed, setFailed] = useState(false);
  const src = brand?.logo_url ? normalizeProductImageUrl(brand.logo_url) : null;

  if (src && !failed) {
    return (
      <span className={`flex flex-shrink-0 items-center justify-center overflow-hidden bg-white ring-1 ring-black/5 ${className}`}>
        <img
          src={src}
          alt={`${brand.name} logo`}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain"
        />
      </span>
    );
  }

  return (
    <span
      className={`flex flex-shrink-0 items-center justify-center font-extrabold uppercase ring-1 ${textClass} ${badgeFor(brand?.name || '')} ${className}`}
      aria-hidden="true"
    >
      {(brand?.name || '?').charAt(0)}
    </span>
  );
};

export default BrandLogo;
