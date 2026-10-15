import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Pages that already render their own back control or are top-level entry points.
const HIDDEN_ON = (pathname) => pathname === '/' || pathname.startsWith('/orders/');

// Mobile-only "Back" bar. Goes to the previous screen in the app, or Home when the page was
// opened directly (no earlier history entry, e.g. a shared link).
const BackButton = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  if (HIDDEN_ON(pathname)) return null;

  const handleBack = () => {
    const hasHistory = (window.history.state?.idx ?? 0) > 0;
    if (hasHistory) navigate(-1);
    else navigate('/');
  };

  return (
    <div className="container-main pt-2 md:hidden">
      <button
        type="button"
        onClick={handleBack}
        aria-label="Go back"
        className="-ml-2 inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-sm font-semibold text-gray-700 transition hover:text-primary active:bg-gray-100"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>
    </div>
  );
};

export default BackButton;
