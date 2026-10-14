import React from 'react';

// Shared page header used by footer/info pages and the blog.
const PageHero = ({ eyebrow, title, subtitle, children }) => (
  <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-800 via-primary-700 to-primary px-5 py-8 text-white sm:px-10 sm:py-12">
    <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" aria-hidden="true" />
    <div className="pointer-events-none absolute -bottom-16 right-24 h-32 w-32 rounded-full bg-white/5" aria-hidden="true" />
    <div className="relative max-w-2xl">
      {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary-200">{eyebrow}</p>}
      <h1 className="text-2xl font-extrabold leading-tight sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-3 text-sm leading-relaxed text-white/85 sm:text-base">{subtitle}</p>}
      {children}
    </div>
  </header>
);

export default PageHero;
