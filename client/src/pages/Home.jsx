import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import HeroBanner from '../components/HeroBanner';
import CategoryGrid from '../components/CategoryGrid';
import FlashSale from '../components/FlashSale';
import ProductCard from '../components/ProductCard';
import { ProductSkeleton } from '../components/ui';
import { productService } from '../services';

const TRUST_FEATURES = [
  {
    title: 'Free Shipping',
    desc: 'On orders over Rs. 2,000',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    title: 'Secure Payment',
    desc: '100% protected payments',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    title: 'Easy Returns',
    desc: '7-day return policy',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a5 5 0 015 5v1M3 10l4-4M3 10l4 4" />
      </svg>
    ),
  },
  {
    title: '24/7 Support',
    desc: "We're here whenever you need us",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M5.636 5.636l3.536 3.536m0 5.656l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productService.getAllProducts({ limit: 25 })
      .then((res) => setProducts(res.data?.data || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in">
      <HeroBanner />
      <CategoryGrid />
      {!loading && products.length > 0 && <FlashSale products={products} />}

      {/* Just For You */}
      <section className="container-main py-4 pb-8">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-card sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-dark sm:text-xl">Just For You</h2>
            <Link
              to="/products"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition hover:underline"
            >
              See All
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {loading ? (
            <ProductSkeleton count={10} />
          ) : products.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-500">No products available yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Trust badges */}
      <section className="container-main pb-10">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {TRUST_FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col items-center gap-2.5 rounded-xl border border-gray-100 bg-white p-4 text-center shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover sm:flex-row sm:items-center sm:gap-4 sm:text-left"
            >
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                {feature.icon}
              </span>
              <div>
                <h3 className="text-sm font-bold text-dark">{feature.title}</h3>
                <p className="text-xs text-gray-500">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;