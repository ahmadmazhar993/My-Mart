import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';

const slides = [
  {
    id: 1,
    title: 'Welcome to AHM Mart',
    subtitle: 'Up to 70% off on top brands — shop smarter today',
    badge: 'Limited Time',
    cta: 'Shop Now',
    link: '/products',
    image: '/Wellcome.png',
  },
  {
    id: 2,
    title: 'Electronics Sale',
    subtitle: 'Phones, earbuds, smart watches & more at great prices',
    badge: 'Up to 40% Off',
    cta: 'Explore Deals',
    link: '/products?category=electronics',
    image: '/Electronics.png',
  },
  {
    id: 3,
    title: 'Fresh Groceries',
    subtitle: 'Daily essentials delivered to your doorstep',
    badge: 'Free Delivery',
    cta: 'Shop Groceries',
    link: '/products?category=groceries',
    image: '/Grocery.png',
  },
];

const SLIDE_DURATION = 5000;

const ChevronLeft = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRight = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
  </svg>
);

const HeroBanner = () => {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const touchStartX = useRef(null);

  const goTo = useCallback((index) => {
    setCurrent(((index % slides.length) + slides.length) % slides.length);
    setProgressKey((k) => k + 1);
  }, []);

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  useEffect(() => {
    if (paused) return undefined;
    const timer = setTimeout(next, SLIDE_DURATION);
    return () => clearTimeout(timer);
  }, [current, paused, next]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta > 50) prev();
    else if (delta < -50) next();
    touchStartX.current = null;
  };

  return (
    <section className="container-main py-4">
      <div
        className="group relative h-[220px] overflow-hidden rounded-xl shadow-card sm:h-[300px] md:h-[360px]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 flex items-center transition-opacity duration-700 ${
              index === current ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />

            <div className="relative z-10 max-w-lg px-8 sm:px-12 md:px-16">
              {slide.badge && (
                <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-sm">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                  </svg>
                  {slide.badge}
                </span>
              )}
              <h2 className="mb-2 text-2xl font-extrabold text-white drop-shadow-sm sm:text-3xl md:text-4xl">
                {slide.title}
              </h2>
              <p className="mb-6 text-sm text-white/90 sm:text-base">{slide.subtitle}</p>
              <Link
                to={slide.link}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-2.5 text-sm font-bold text-primary-700 shadow-md transition hover:-translate-y-0.5 hover:bg-primary-50 hover:shadow-lg"
              >
                {slide.cta}
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        ))}

        {/* Prev / Next arrows — appear on hover (desktop) */}
        <button
          type="button"
          onClick={prev}
          aria-label="Previous slide"
          className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white opacity-0 backdrop-blur-sm transition hover:bg-white/30 group-hover:opacity-100 sm:block"
        >
          <ChevronLeft />
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="Next slide"
          className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white opacity-0 backdrop-blur-sm transition hover:bg-white/30 group-hover:opacity-100 sm:block"
        >
          <ChevronRight />
        </button>

        {/* Progress-bar dots */}
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Go to slide ${index + 1}`}
              className="relative h-1.5 w-8 overflow-hidden rounded-full bg-white/30"
            >
              {index === current && (
                <span
                  key={progressKey}
                  className="absolute inset-y-0 left-0 rounded-full bg-white"
                  style={{
                    animation: paused ? 'none' : `heroProgress ${SLIDE_DURATION}ms linear forwards`,
                    width: paused ? '100%' : undefined,
                  }}
                />
              )}
              {index < current && <span className="absolute inset-0 rounded-full bg-white" />}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes heroProgress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </section>
  );
};

export default HeroBanner;