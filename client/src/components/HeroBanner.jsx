import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const slides = [
  {
    id: 1,
    title: 'Welcome to AHM Mart',
    subtitle: 'Up to 70% off on top brands — shop smarter today',
    cta: 'Shop Now',
    link: '/products',
    image: '/Wellcome.png',
  },
  {
    id: 2,
    title: 'Electronics Sale',
    subtitle: 'Phones, earbuds, smart watches & more at great prices',
    cta: 'Explore',
    link: '/products?category=electronics',
    image: '/Electronics.png',
  },
  {
    id: 3,
    title: 'Fresh Groceries',
    subtitle: 'Daily essentials delivered to your doorstep',
    cta: 'Shop Groceries',
    link: '/products?category=groceries',
    image: '/Grocery.png',
  },
];

const HeroBanner = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="container-main py-4">
      <div className="relative rounded-sm overflow-hidden h-[200px] sm:h-[280px] md:h-[320px]">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 flex items-center transition-opacity duration-700 ${
              index === current ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
            <div className="relative px-8 sm:px-12 md:px-16 max-w-lg animate-slide-up z-10">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-2">
                {slide.title}
              </h2>
              <p className="text-white/90 text-sm sm:text-base mb-6">{slide.subtitle}</p>
              <Link
                to={slide.link}
                className="inline-block bg-white text-primary font-bold px-6 py-2.5 rounded-sm hover:bg-gray-100 transition-colors text-sm"
              >
                {slide.cta}
              </Link>
            </div>
          </div>
        ))}

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setCurrent(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === current ? 'bg-white w-6' : 'bg-white/50'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
