import React from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';

// Compact brand tile (logo + name). Used on the home page.
const BrandTile = ({ brand }) => (
  <Link
    to={`/products?brand=${encodeURIComponent(brand.name)}`}
    className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:bg-primary-50/40 hover:shadow-card sm:p-3"
  >
    <BrandLogo brand={brand} className="h-11 w-11 rounded-full sm:h-12 sm:w-12" />
    <span className="min-w-0 truncate text-sm font-semibold text-gray-800 transition-colors group-hover:text-primary-700">
      {brand.name}
    </span>
  </Link>
);

export default BrandTile;
