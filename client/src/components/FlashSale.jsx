import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from './ProductCard';

const FlashSale = ({ products = [] }) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 5, minutes: 59, seconds: 59 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { hours, minutes, seconds } = prev;
        seconds -= 1;
        if (seconds < 0) { seconds = 59; minutes -= 1; }
        if (minutes < 0) { minutes = 59; hours -= 1; }
        if (hours < 0) { hours = 5; minutes = 59; seconds = 59; }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const saleProducts = products.filter((p) => p.discount_price || p.discount_percentage).slice(0, 5);
  if (saleProducts.length === 0) return null;

  const pad = (n) => String(n).padStart(2, '0');

  return (
    <section className="container-main py-4">
      <div className="bg-white rounded-sm shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-gradient-to-r from-primary to-accent-dark">
          <div className="flex items-center gap-3">
            <h2 className="text-white font-extrabold text-lg sm:text-xl italic">Flash Sale</h2>
            <div className="flex items-center gap-1">
              {[timeLeft.hours, timeLeft.minutes, timeLeft.seconds].map((val, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="text-white font-bold">:</span>}
                  <span className="bg-dark text-white text-xs font-bold px-1.5 py-0.5 rounded-sm min-w-[28px] text-center">
                    {pad(val)}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>
          <Link to="/products?sale=true" className="text-white text-sm font-semibold hover:underline">
            SHOP ALL &rarr;
          </Link>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {saleProducts.map((product) => (
            <ProductCard key={product.id} product={product} compact />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FlashSale;
