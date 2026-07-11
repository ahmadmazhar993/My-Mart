import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import HeroBanner from '../components/HeroBanner';
import CategoryGrid from '../components/CategoryGrid';
import FlashSale from '../components/FlashSale';
import ProductCard from '../components/ProductCard';
import { ProductSkeleton } from '../components/ui';
import { productService } from '../services';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productService.getAllProducts({ limit: 20 })
      .then((res) => setProducts(res.data?.data || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in">
      <HeroBanner />
      <CategoryGrid />
      {!loading && products.length > 0 && <FlashSale products={products} />}

      <section className="container-main py-4 pb-8">
        <div className="bg-white rounded-sm shadow-card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Just For You</h2>
            <Link to="/products" className="text-primary text-sm font-semibold hover:underline">
              See All &rarr;
            </Link>
          </div>
          {loading ? (
            <ProductSkeleton count={10} />
          ) : products.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No products available yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="container-main pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { title: 'Free Shipping', desc: 'On orders over Rs. 1,000', icon: '🚚' },
            { title: 'Secure Payment', desc: '100% protected payments', icon: '🔒' },
            { title: 'Easy Returns', desc: '7-day return policy', icon: '↩️' },
          ].map((feature) => (
            <div key={feature.title} className="bg-white rounded-sm shadow-card p-5 flex items-center gap-4">
              <span className="text-3xl">{feature.icon}</span>
              <div>
                <h3 className="font-bold text-sm text-dark">{feature.title}</h3>
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
