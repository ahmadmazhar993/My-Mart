import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { SHIPPING_TIERS } from '../config/shipping';
import { formatPrice } from '../utils/format';

const FREE_TIER = SHIPPING_TIERS.find((tier) => tier.cost === 0);

// Slide copy only states things the store can back up: delivery terms come from config, and no
// discount percentages or "limited time" claims are made here.
const slides = [
  {
    id: 1,
    title: 'Everyday shopping, made simple',
    subtitle: FREE_TIER
      ? `Groceries, essentials and more. Free delivery on orders over ${formatPrice(FREE_TIER.minSubtotal)}.`
      : 'Groceries, essentials and more, delivered to your door.',
    badge: FREE_TIER ? 'Free delivery' : null,
    cta: 'Shop now',
    link: '/products',
    image: '/Wellcome.webp',
    imageSmall: '/Wellcome-800.webp',
  },
  {
    id: 2,
    title: 'Electronics',
    subtitle: 'Phones, earbuds, smart watches and more.',
    cta: 'Explore electronics',
    link: '/products?category=electronics',
    image: '/Electronics.webp',
    imageSmall: '/Electronics-800.webp',
  },
  {
    id: 3,
    title: 'Fresh groceries',
    subtitle: 'Daily essentials, delivered to your doorstep.',
    cta: 'Shop groceries',
    link: '/products?category=groceries',
    image: '/Grocery.webp',
    imageSmall: '/Grocery-800.webp',
  },
  {
    id: 4,
    title: 'Thank You for Choosing AHM Mart',
    // link: '/products',
    image: '/Thank_you.webp',
    mobileImage: '/Thank_you_mobile.webp',
    imageOnly: true, // artwork already contains all text, so no overlay or gradient
  },
];

const SLIDE_DURATION = 5000;

const HeroBanner = () => {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  // Autoplay is opt-out: people who prefer reduced motion start paused, and anyone can pause (WCAG 2.2.2).
  const [userPaused, setUserPaused] = useState(
    () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
  );
  const stopped = paused || userPaused;
  const [progressKey, setProgressKey] = useState(0);
  const touchStartX = useRef(null);

  const goTo = useCallback((index) => {
    setCurrent(((index % slides.length) + slides.length) % slides.length);
    setProgressKey((k) => k + 1);
  }, []);

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  useEffect(() => {
    if (stopped) return undefined;
    const timer = setTimeout(next, SLIDE_DURATION);
    return () => clearTimeout(timer);
  }, [current, stopped, next]);

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

  // Light artwork needs dark controls; dark-overlay slides keep white controls
  const lightSlide = Boolean(slides[current].imageOnly);

  const arrowClass = lightSlide
    ? 'bg-white/90 text-gray-800 shadow-md hover:bg-white'
    : 'bg-white/15 text-white ring-1 ring-white/30 hover:bg-white/30';

  return (
    <section className="container-main py-4" aria-roledescription="carousel" aria-label="Featured offers">
      <div
        className="group relative h-[230px] overflow-hidden rounded-2xl bg-white shadow-soft min-[400px]:h-[250px] sm:h-[320px] md:h-[400px]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {slides.map((slide, index) => {
          const isActive = index === current;
          // Active slide fades in on top; the old one waits, then fades out underneath,
          // so the background never shows through mid-transition.
          const visibility = `transition-opacity duration-700 ${isActive ? 'z-10 opacity-100' : 'pointer-events-none z-0 opacity-0 delay-700'
            }`;

          // Image-only slide: clean artwork, no gradient, no overlay text
          if (slide.imageOnly) {
            // Fade top/bottom edges into white on mobile when the image doesn't fill the box
            const mobileFade = slide.mobileImage
              ? 'object-cover'
              : 'object-contain [mask-image:linear-gradient(to_bottom,transparent,black_15%,black_85%,transparent)]';

            return (
              <Link
                key={slide.id}
                to={slide.link}
                tabIndex={isActive ? 0 : -1}
                aria-hidden={!isActive}
                aria-label={slide.title}
                className={`absolute inset-0 block overflow-hidden bg-white ${visibility}`}
              >
                <picture className="block h-full w-full">
                  {slide.mobileImage && (
                    <source media="(max-width: 767px)" srcSet={slide.mobileImage} />
                  )}
                  <img
                    src={slide.image}
                    alt={slide.title}
                    draggable={false}
                    loading="lazy"
                    decoding="async"
                    className={`h-full w-full object-center ${mobileFade} md:object-cover md:[mask-image:none]`}
                  />
                </picture>
              </Link>
            );
          }

          return (
            <div key={slide.id} className={`absolute inset-0 flex items-center ${visibility}`}>
              {/* WebP in two sizes. The first slide is the page's largest image, so it loads eagerly and first. */}
              <img
                src={slide.image}
                srcSet={slide.imageSmall ? `${slide.imageSmall} 800w, ${slide.image} 1600w` : undefined}
                sizes="(max-width: 1280px) 100vw, 1280px"
                alt={slide.title}
                width={1600}
                height={854}
                loading={index === 0 ? 'eager' : 'lazy'}
                fetchPriority={index === 0 ? 'high' : undefined}
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-primary-900/95 via-primary-900/75 to-primary-900/25 sm:via-primary-900/55 sm:to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/30 to-transparent" />

              <div className="relative z-10 max-w-xl px-5 pb-7 sm:px-12 sm:pb-0 md:px-16">
                {slide.badge && (
                  <span className="mb-2 inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white ring-1 ring-white/30 backdrop-blur-sm sm:mb-3 sm:text-xs">
                    {slide.badge}
                  </span>
                )}
                <h2 className="mb-1.5 text-2xl font-extrabold leading-[1.1] tracking-tight text-white drop-shadow-sm sm:mb-3 sm:text-4xl md:text-5xl">
                  {slide.title}
                </h2>
                <p className="mb-3 line-clamp-2 max-w-md text-xs text-white/90 sm:mb-6 sm:text-lg">{slide.subtitle}</p>
                <Link
                  to={slide.link}
                  tabIndex={isActive ? 0 : -1}
                  className="group/cta inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-primary-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-primary-50 sm:min-h-[48px] sm:px-7 sm:text-base"
                >
                  {slide.cta}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          );
        })}

        {/* Prev / Next arrows: desktop */}
        <button
          type="button"
          onClick={prev}
          aria-label="Previous slide"
          className={`absolute left-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full opacity-0 backdrop-blur-sm transition focus-visible:opacity-100 group-hover:opacity-100 sm:flex ${arrowClass}`}
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="Next slide"
          className={`absolute right-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full opacity-0 backdrop-blur-sm transition focus-visible:opacity-100 group-hover:opacity-100 sm:flex ${arrowClass}`}
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Slide controls: progress dots + pause/play */}
        <div className="absolute inset-x-0 bottom-2 z-20 flex items-center justify-center gap-1 sm:bottom-3">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === current}
              className="flex h-6 items-center px-1"
            >
              <span className="relative block h-1.5 w-6 overflow-hidden rounded-full bg-white/40 ring-1 ring-black/10 sm:w-8">
                {index === current && (
                  <span
                    key={progressKey}
                    className="absolute inset-y-0 left-0 rounded-full bg-white"
                    style={{
                      animation: stopped ? 'none' : `heroProgress ${SLIDE_DURATION}ms linear forwards`,
                      width: stopped ? '100%' : undefined,
                    }}
                  />
                )}
                {index < current && <span className="absolute inset-0 rounded-full bg-white" />}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setUserPaused((p) => !p)}
            aria-label={userPaused ? 'Play slideshow' : 'Pause slideshow'}
            className={`ml-1 flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-sm transition ${arrowClass}`}
          >
            {userPaused ? <Play className="h-3.5 w-3.5" aria-hidden="true" /> : <Pause className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
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