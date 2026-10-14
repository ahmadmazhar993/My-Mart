import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Breadcrumb } from '../components/ui';
import PageHero from '../components/PageHero';
import BlogCard, { BlogCover, BlogMeta } from '../components/blog/BlogCard';
import usePageMeta from '../hooks/usePageMeta';
import { blogService } from '../services/blog';

const PAGE_SIZE = 6;

const Blog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const [visible, setVisible] = useState(PAGE_SIZE);

  usePageMeta({
    title: 'Blog: Shopping Guides & Tips',
    description: 'Practical guides on choosing products, shopping safely online and caring for what you buy, from the AHM Mart team.',
    path: '/blog',
  });

  const categories = useMemo(() => blogService.categories(), []);
  const isFiltering = Boolean(query.trim() || category);
  const { items, total } = useMemo(() => blogService.list({ query, category }), [query, category]);
  const featured = useMemo(() => (isFiltering ? null : blogService.featured()), [isFiltering]);
  const gridItems = featured ? items.filter((a) => a.slug !== featured.slug) : items;

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
    setVisible(PAGE_SIZE);
  };

  const clearFilters = () => {
    setSearchParams({}, { replace: true });
    setVisible(PAGE_SIZE);
  };

  return (
    <div className="container-main animate-fade-in py-4 sm:py-8">
      <div className="hidden sm:block">
        <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Blog' }]} />
      </div>

      <PageHero
        eyebrow="AHM Mart Blog"
        title="Shopping guides & tips"
        subtitle="Practical advice on choosing products, shopping safely online and looking after what you buy."
      />

      {/* Search + category filters */}
      <div className="mt-5 space-y-3 sm:mt-8">
        <form role="search" onSubmit={(e) => e.preventDefault()} className="relative">
          <label htmlFor="blog-search" className="sr-only">Search articles</label>
          <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="blog-search"
            type="search"
            value={query}
            onChange={(e) => setParam('q', e.target.value)}
            placeholder="Search articles"
            className="search-clear-red h-12 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm shadow-card focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </form>

        <div className="scrollbar-hide -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter by category">
          {[{ id: '', label: 'All' }, ...categories].map((c) => (
            <button
              key={c.id || 'all'}
              type="button"
              aria-pressed={category === c.id}
              onClick={() => setParam('category', c.id)}
              className={`flex-shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] font-medium transition ${
                category === c.id ? 'border-primary bg-primary text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-primary hover:text-primary'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Featured article */}
      {featured && (
        <section aria-labelledby="featured-heading" className="mt-6">
          <h2 id="featured-heading" className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">Featured</h2>
          <article className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card transition hover:shadow-card-hover md:grid md:grid-cols-2">
            <BlogCover article={featured} className="md:h-full md:aspect-auto" />
            <div className="flex flex-col justify-center p-5 sm:p-8">
              <span className="mb-3 inline-flex w-fit rounded-full bg-primary-50 px-2.5 py-0.5 text-[11px] font-semibold text-primary-700">
                {featured.categoryInfo.label}
              </span>
              <h3 className="text-xl font-extrabold leading-snug text-dark sm:text-2xl">
                <Link to={`/blog/${featured.slug}`} className="after:absolute after:inset-0 hover:text-primary focus:outline-none">
                  {featured.title}
                </Link>
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-base">{featured.excerpt}</p>
              <BlogMeta article={featured} className="mt-4" />
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                Read article
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </article>
        </section>
      )}

      {/* Article grid */}
      <section aria-labelledby="latest-heading" className="mt-8">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="latest-heading" className="text-lg font-bold text-dark sm:text-xl">
            {isFiltering ? 'Results' : 'Latest articles'}
          </h2>
          {isFiltering && (
            <p className="text-sm text-gray-500" aria-live="polite">{total} {total === 1 ? 'article' : 'articles'}</p>
          )}
        </div>

        {gridItems.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-white px-4 py-12 text-center shadow-card">
            <div className="text-4xl" aria-hidden="true">🔍</div>
            <h3 className="mt-3 text-lg font-bold text-dark">
              {isFiltering ? 'No articles match your search' : 'No articles yet'}
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
              {isFiltering ? 'Try a different keyword or choose another category.' : 'New articles will appear here soon.'}
            </p>
            {isFiltering && (
              <button type="button" onClick={clearFilters} className="btn-primary mt-5 text-sm">Clear search and filters</button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
              {gridItems.slice(0, visible).map((article) => (
                <BlogCard key={article.slug} article={article} />
              ))}
            </div>
            {visible < gridItems.length && (
              <div className="mt-6 text-center">
                <button type="button" onClick={() => setVisible((v) => v + PAGE_SIZE)} className="btn-outline bg-white text-sm">
                  Load more articles
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <aside className="mt-10 flex flex-col gap-4 rounded-xl border border-primary-100 bg-primary-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="text-base font-bold text-primary-800 sm:text-lg">Ready to shop?</h2>
          <p className="mt-1 text-sm text-gray-600">Put these tips to work across our product categories.</p>
        </div>
        <Link to="/products" className="btn-primary text-center text-sm">Browse products</Link>
      </aside>
    </div>
  );
};

export default Blog;
