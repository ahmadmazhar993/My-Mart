import React, { useEffect, useState } from 'react';
import { productService } from '../services';
import BrandTile from './BrandTile';
import SectionHeader from './home/SectionHeader';

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
    <section className="container-main py-5 sm:py-8" aria-labelledby="shop-by-brand">
      <SectionHeader
        id="shop-by-brand"
        eyebrow="Trusted names"
        title="Shop by brand"
        to="/brands"
        linkLabel={`View all${brands.length > shown.length ? ` (${brands.length})` : ''}`}
      />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-6">
        {shown.map((brand) => (
          <BrandTile key={brand.name} brand={brand} />
        ))}
      </div>
    </section>
  );
};

export default ShopByBrand;
