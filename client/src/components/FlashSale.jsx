import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Tag } from 'lucide-react';
import ProductCard from './ProductCard';

// Percentage off for one product, from real prices only.
const getDiscountPercent = (p) => {
  if (p.discount_percentage) return Number(p.discount_percentage);
  if (p.discount_price && p.price && Number(p.discount_price) < Number(p.price)) {
    return Math.round(((p.price - p.discount_price) / p.price) * 100);
  }
  return 0;
};

// Home "Deals" row. It lists products that currently carry a discount. There is deliberately no
// countdown: nothing in the data says when a discount ends, so a timer would be invented urgency.
const FlashSale = ({ products = [] }) => {
  const saleProducts = products.filter((p) => p.discount_price || p.discount_percentage).slice(0, 5);
  if (saleProducts.length === 0) return null;

  const best = Math.max(...saleProducts.map(getDiscountPercent));

  return (
    <section className="container-main py-4" aria-labelledby="home-deals">
      <div className="overflow-hidden rounded-2xl border border-primary-100 bg-white shadow-soft">
        <div className="relative flex items-center justify-between gap-3 bg-gradient-to-r from-primary-800 via-primary-600 to-primary-500 px-4 py-4 sm:px-6 sm:py-5">
          <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" aria-hidden="true" />
          <div className="relative flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/25">
              <Tag className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 id="home-deals" className="text-lg font-extrabold leading-tight text-white sm:text-xl">Deals</h2>
              {best > 0 && <p className="text-xs text-white/85 sm:text-sm">Save up to {best}% on selected products</p>}
            </div>
          </div>
          <Link
            to="/products?sale=true"
            className="group relative inline-flex min-h-[44px] flex-shrink-0 items-center gap-1 whitespace-nowrap rounded-xl bg-white px-4 text-sm font-bold text-primary-700 shadow-sm transition hover:bg-primary-50"
          >
            See all
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
        <div className="snap-row p-3 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:p-4 md:grid-cols-4 lg:grid-cols-5">
          {saleProducts.map((product) => (
            <div key={product.id} className="w-[44%] min-w-[140px] flex-shrink-0 sm:w-auto">
              <ProductCard product={product} compact />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FlashSale;
