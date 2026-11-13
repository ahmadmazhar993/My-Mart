import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

// Shared heading for home-page sections: small green eyebrow, title, optional one-line subtitle and a
// "view all" link with a 44px target. Keeps every section's rhythm identical.
const SectionHeader = ({ id, eyebrow, title, subtitle, to, linkLabel = 'View all', light = false }) => (
  <div className="mb-4 flex items-end justify-between gap-3 sm:mb-6">
    <div className="min-w-0">
      {eyebrow && (
        <p className={`mb-1 text-[11px] font-bold uppercase tracking-[0.14em] ${light ? 'text-primary-200' : 'text-primary-500'}`}>{eyebrow}</p>
      )}
      <h2 id={id} className={`text-xl font-extrabold tracking-tight sm:text-2xl ${light ? 'text-white' : 'text-dark'}`}>{title}</h2>
      {subtitle && <p className={`mt-1 text-sm ${light ? 'text-white/80' : 'text-gray-500'}`}>{subtitle}</p>}
    </div>
    {to && (
      <Link
        to={to}
        className={`group inline-flex min-h-[44px] flex-shrink-0 items-center gap-1 whitespace-nowrap text-sm font-semibold transition ${light ? 'text-white hover:text-primary-100' : 'text-primary-700 hover:text-primary-800'}`}
      >
        {linkLabel}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
    )}
  </div>
);

export default SectionHeader;
