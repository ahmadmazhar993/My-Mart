import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { ProductSkeleton, Breadcrumb, EmptyState } from '../components/ui';
import { productService, categoryService } from '../services';

const SORT_OPTIONS = [
  { value: 'popular', label: 'Popularity' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
];

const Products = () => {
  const [searchParams] = useSearchParams();
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const saleOnly = searchParams.get('sale') === 'true';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('popular');
  const [priceRange, setPriceRange] = useState('all');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      productService.getAllProducts({ limit: 100 }),
      categoryService.getAllCategories(),
    ])
      .then(([productsRes, categoriesRes]) => {
        setProducts(productsRes.data?.data || []);
        setCategories(categoriesRes.data?.data || []);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const categoryMatch = categories.find((c) => c.slug === category);
  const categoryId = categoryMatch?.id;

  const filtered = products
    .filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())
        && !(p.description || '').toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryId && p.category_id !== categoryId) return false;
      if (saleOnly && !p.discount_price) return false;
      if (priceRange === 'under-500' && (p.discount_price || p.price) >= 500) return false;
      if (priceRange === '500-2000') {
        const price = p.discount_price || p.price;
        if (price < 500 || price > 2000) return false;
      }
      if (priceRange === 'over-2000' && (p.discount_price || p.price) <= 2000) return false;
      return true;
    })
    .sort((a, b) => {
      const priceA = a.discount_price || a.price;
      const priceB = b.discount_price || b.price;
      if (sort === 'price-asc') return priceA - priceB;
      if (sort === 'price-desc') return priceB - priceA;
      if (sort === 'rating') return (b.rating || 0) - (a.rating || 0);
      return 0;
    });

  const pageTitle = saleOnly
    ? 'Flash Sale'
    : search
      ? `Results for "${search}"`
      : category
        ? categoryMatch?.name || category.charAt(0).toUpperCase() + category.slice(1)
        : 'All Products';

  return (
    <div className="container-main py-6 animate-fade-in">
      <Breadcrumb items={[
        { label: 'Home', to: '/' },
        { label: pageTitle },
      ]} />

      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-56 flex-shrink-0">
          <div className="bg-white rounded-sm shadow-card p-4 sticky top-36">
            <h3 className="font-bold text-sm mb-3">Filters</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Price Range</p>
                {[
                  { value: 'all', label: 'All Prices' },
                  { value: 'under-500', label: 'Under Rs. 500' },
                  { value: '500-2000', label: 'Rs. 500 - 2,000' },
                  { value: 'over-2000', label: 'Over Rs. 2,000' },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 py-1 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="price"
                      value={opt.value}
                      checked={priceRange === opt.value}
                      onChange={(e) => setPriceRange(e.target.value)}
                      className="accent-primary"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-1">
          <div className="bg-white rounded-sm shadow-card p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-dark">{pageTitle}</h1>
              <p className="text-sm text-gray-500">{filtered.length} products found</p>
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="input-field w-auto text-sm py-2"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <ProductSkeleton count={10} />
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-sm shadow-card">
              <EmptyState
                icon="🔍"
                title="No products found"
                description="Try adjusting your filters or search terms."
                action={<Link to="/products" className="btn-primary">Browse All Products</Link>}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Products;
