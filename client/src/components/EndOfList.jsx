import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, CheckCircle2 } from 'lucide-react';

// Shown when infinite scroll has loaded every product. Says how many there were, and gives two ways
// on: back to the top, or (on the home page) the full product list.
const EndOfList = ({ total, browseAllTo }) => (
  <div className="mx-auto mt-2 flex max-w-md flex-col items-center rounded-2xl border border-primary-100 bg-gradient-to-b from-primary-50 to-white px-5 py-6 text-center shadow-card">
    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-100 text-primary-700">
      <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
    </span>
    <p className="mt-3 text-base font-bold text-dark">You&apos;re all caught up</p>
    <p className="mt-0.5 text-sm text-gray-500">
      You&apos;ve seen all {total} {total === 1 ? 'product' : 'products'}.
    </p>
    <div className="mt-4 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
      {browseAllTo && (
        <Link
          to={browseAllTo}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
        >
          Browse all products
        </Link>
      )}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-primary-200 bg-white px-5 text-sm font-semibold text-primary-700 transition hover:bg-primary-50"
      >
        <ArrowUp className="h-4 w-4" aria-hidden="true" />
        Back to top
      </button>
    </div>
  </div>
);

export default EndOfList;
