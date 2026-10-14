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
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-card">
        <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-primary to-accent-dark px-3 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <h2 className="whitespace-nowrap text-base font-extrabold italic text-white sm:text-xl">⚡ Flash Sale</h2>
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
          <Link to="/products?sale=true" className="whitespace-nowrap text-xs font-semibold text-white hover:underline sm:text-sm">
            See all &rarr;
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
