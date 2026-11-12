import React from 'react';

// Placeholder that matches ProductCard's box (same border, 4:5 image area, text rows, button) so the
// space for an incoming page is already reserved and nothing jumps when real products replace it.
const ProductCardSkeleton = () => (
  <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-100 bg-white" aria-hidden="true">
    <div className="aspect-[4/5] animate-pulse bg-gray-100" />
    <div className="flex flex-1 flex-col p-2.5 sm:p-3">
      <div className="mb-1.5 h-3 w-1/3 animate-pulse rounded bg-gray-100" />
      <div className="mb-1.5 h-[2.5em] w-full animate-pulse rounded bg-gray-100 text-[13px]" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100" />
      <div className="mt-auto pt-3">
        <div className="h-10 w-full animate-pulse rounded-lg bg-gray-100" />
      </div>
    </div>
  </div>
);

export default ProductCardSkeleton;
