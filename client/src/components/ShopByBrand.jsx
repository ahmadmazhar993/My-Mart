import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productService } from '../services';
import BrandTile from './BrandTile';

const MAX_BRANDS = 12;

// Home-page brand section. Renders nothing until at least one product has a brand.
const ShopByBrand = () => {
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    let cancelled = false;
    productService.getBrands()
      .then((res) => { if (!cancelled) setBrands(res.data?.data || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (brands.length === 0) return null;

  const shown = [...brands].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, MAX_BRANDS);

  return (
    <section className="container-main py-4" aria-labelledby="shop-by-brand">
      <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-card sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="shop-by-brand" className="text-lg font-bold tracking-tight text-dark sm:text-xl">Shop by Brand</h2>
          <Link to="/brands" className="text-sm font-semibold text-primary transition hover:underline">
            View all{brands.length > shown.length ? ` (${brands.length})` : ''}
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-6">
          {shown.map((brand) => (
            <BrandTile key={brand.name} brand={brand} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ShopByBrand;
