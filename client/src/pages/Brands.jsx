import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb, EmptyState } from '../components/ui';
import BrandLoader from '../components/BrandLoader';
import BrandLogo from '../components/BrandLogo';
import { productService } from '../services';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');

const brandPath = (brand) => `/products?brand=${encodeURIComponent(brand.name)}`;

const ArrowIcon = () => (
  <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

// Large card for featured / popular brands.
const FeaturedCard = ({ brand }) => (
  <Link
    to={brandPath(brand)}
    className="group flex flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-primary-200 hover:shadow-card-hover"
  >
    <BrandLogo brand={brand} className="h-16 w-16 rounded-2xl" textClass="text-2xl" />
    <h3 className="mt-3 truncate text-base font-bold text-dark">{brand.name}</h3>
    <p className="mt-1 line-clamp-2 min-h-[2.5em] text-xs leading-relaxed text-gray-500">
      {brand.description || `Explore ${brand.name} products.`}
    </p>
    <div className="mt-3 flex items-center justify-end border-t border-gray-100 pt-3 text-xs">
      <span className="inline-flex items-center gap-1 font-semibold text-primary">
        Shop now <ArrowIcon />
      </span>
    </div>
  </Link>
);

const GRID_CLASS = 'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5';

// Logo-first card for the directory.
const BrandCard = ({ brand }) => (
  <Link
    to={brandPath(brand)}
    className="group flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-4 text-center transition-all duration-200 hover:-translate-y-1 hover:border-primary-200 hover:shadow-card-hover"
  >
    <BrandLogo brand={brand} className="h-20 w-20 rounded-2xl sm:h-24 sm:w-24" textClass="text-3xl" />
    <h3 className="mt-3 w-full truncate text-sm font-bold text-gray-800 transition-colors group-hover:text-primary-700">{brand.name}</h3>
    {brand.description && (
      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">{brand.description}</p>
    )}
  </Link>
);

const Brands = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    productService.getBrands()
      .then((res) => { if (!cancelled) setBrands(res.data?.data || []); })
      .catch(() => { if (!cancelled) setBrands([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const needle = query.trim().toLowerCase();
  const searching = needle.length > 0;

  // Featured brands the admin picked; otherwise the most popular ones (only when there are enough
  // brands for a "popular" row to be meaningful).
  const spotlight = useMemo(() => {
    const featured = brands.filter((b) => b.is_featured);
    if (featured.length > 0) return { title: 'Featured brands', list: featured.slice(0, 8) };
    if (brands.length > 6) {
      return { title: 'Popular brands', list: [...brands].sort((a, b) => b.count - a.count).slice(0, 4) };
    }
    return null;
  }, [brands]);

  // A-Z groups (filtered by the search box).
  const groups = useMemo(() => {
    const filtered = brands
      .filter((b) => !needle || b.name.toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name));
    const byLetter = new Map();
    filtered.forEach((brand) => {
      const first = brand.name.charAt(0).toUpperCase();
      const letter = /[A-Z]/.test(first) ? first : '#';
      if (!byLetter.has(letter)) byLetter.set(letter, []);
      byLetter.get(letter).push(brand);
    });
    return LETTERS.filter((l) => byLetter.has(l)).map((l) => [l, byLetter.get(l)]);
  }, [brands, needle]);

  const grouped = !searching && brands.length > 12;
  const matchCount = groups.reduce((n, [, list]) => n + list.length, 0);
  const activeLetters = new Set(groups.map(([l]) => l));
  const totalProducts = brands.reduce((n, b) => n + b.count, 0);

  const jumpTo = (letter) => {
    const el = document.getElementById(`brands-${letter === '#' ? 'other' : letter}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="container-main animate-fade-in py-6">
      <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Brands' }]} />

      {/* Hero */}
      <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 p-5 text-white shadow-card sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-white/5" aria-hidden="true" />
        <div className="relative max-w-xl">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Shop by Brand</h1>
          <p className="mt-1.5 text-sm text-white/85 sm:text-base">
            Browse the brands you trust and find everything they offer in one place.
          </p>

          {!loading && brands.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
              <span className="rounded-full bg-white/15 px-3 py-1 ring-1 ring-white/25">{brands.length} {brands.length === 1 ? 'brand' : 'brands'}</span>
              <span className="rounded-full bg-white/15 px-3 py-1 ring-1 ring-white/25">{totalProducts} products</span>
            </div>
          )}

          <div className="relative mt-5">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search brands"
              aria-label="Search brands"
              className="w-full rounded-xl border-0 bg-white py-3 pl-10 pr-4 text-sm text-gray-800 shadow-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/60"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <BrandLoader minHeight={320} text="Loading brands" />
      ) : brands.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white shadow-card">
          <EmptyState
            icon="🏷️"
            title="No brands yet"
            description="Brands will appear here once products are assigned to them."
            action={
              <Link to="/products" className="inline-flex items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600">
                Browse All Products
              </Link>
            }
          />
        </div>
      ) : (
        <>
          {/* Featured / popular */}
          {spotlight && !searching && (
            <section className="mb-6" aria-label={spotlight.title}>
              <h2 className="mb-3 text-lg font-bold tracking-tight text-dark sm:text-xl">{spotlight.title}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {spotlight.list.map((brand) => (
                  <FeaturedCard key={brand.name} brand={brand} />
                ))}
              </div>
            </section>
          )}

          {/* A-Z jump bar (only worthwhile with many brands) */}
          {grouped && (
            <nav
              aria-label="Jump to letter"
              className="mb-4 overflow-x-auto rounded-xl border border-gray-100 bg-white px-2 py-2 shadow-card"
            >
              <div className="flex min-w-max gap-1">
                {LETTERS.map((letter) => {
                  const enabled = activeLetters.has(letter);
                  return (
                    <button
                      key={letter}
                      type="button"
                      disabled={!enabled}
                      onClick={() => jumpTo(letter)}
                      className={`h-8 w-8 rounded-lg text-xs font-bold transition ${
                        enabled ? 'text-primary-700 hover:bg-primary-50' : 'cursor-default text-gray-300'
                      }`}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>
            </nav>
          )}

          {matchCount === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-white shadow-card">
              <EmptyState icon="🔍" title="No brands found" description="Try a different search." />
            </div>
          ) : grouped ? (
            <div className="space-y-4">
              {groups.map(([letter, list]) => (
                <section
                  key={letter}
                  id={`brands-${letter === '#' ? 'other' : letter}`}
                  className="scroll-mt-40 rounded-2xl border border-gray-100 bg-white p-4 shadow-card sm:p-6"
                  aria-label={`Brands starting with ${letter}`}
                >
                  <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-primary-700">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-base ring-1 ring-primary-100">{letter}</span>
                    <span className="text-xs font-medium text-gray-400">{list.length}</span>
                  </h2>
                  <div className={GRID_CLASS}>
                    {list.map((brand) => (
                      <BrandCard key={brand.name} brand={brand} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card sm:p-6" aria-label="All brands">
              <h2 className="mb-4 text-lg font-bold tracking-tight text-dark sm:text-xl">
                {searching ? `${matchCount} ${matchCount === 1 ? 'brand' : 'brands'} found` : 'All brands'}
              </h2>
              <div className={GRID_CLASS}>
                {groups.flatMap(([, list]) => list).map((brand) => (
                  <BrandCard key={brand.name} brand={brand} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default Brands;
