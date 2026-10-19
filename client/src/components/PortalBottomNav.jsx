import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Ellipsis, LogOut, Store, X } from 'lucide-react';

// Same look and behaviour as the customer BottomNav (components/BottomNav.jsx): a fixed tab bar on
// phones, hidden from `md` up where the sidebar takes over. Extra destinations live in a bottom
// sheet opened by the last tab, just like "Categories" in the customer portal.
const itemClass = (active) => `relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors focus:outline-none focus-visible:bg-primary-50 ${
  active ? 'text-primary' : 'text-gray-500 active:text-primary'
}`;

const matches = (pathname, to) => pathname === to || pathname.startsWith(`${to}/`);

const PortalBottomNav = ({
  label, primary, more, moreTitle = 'More', email, onLogout,
}) => {
  const { pathname } = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const moreActive = more.some((item) => matches(pathname, item.to));

  useEffect(() => { setSheetOpen(false); }, [pathname]);
  useEffect(() => {
    if (!sheetOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setSheetOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sheetOpen]);

  return (
    <>
      {sheetOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-label={moreTitle}>
          <button type="button" aria-label={`Close ${moreTitle.toLowerCase()}`} className="absolute inset-0 bg-black/40" onClick={() => setSheetOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white pb-safe shadow-2xl animate-slide-up">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-dark">{moreTitle}</h2>
                {email ? <p className="truncate text-xs text-gray-500">{email}</p> : null}
              </div>
              <button type="button" onClick={() => setSheetOpen(false)} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100">
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 p-4">
              {more.map(({ to, label: text, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center text-xs font-medium ${isActive ? 'border-primary-100 bg-primary-50 font-semibold text-primary-700' : 'border-gray-100 text-gray-700 active:bg-primary-50'}`}
                >
                  <Icon size={24} aria-hidden="true" />
                  <span className="line-clamp-2">{text}</span>
                </NavLink>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-gray-100 p-4">
              <Link to="/" className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 active:bg-gray-50">
                <Store size={16} aria-hidden="true" /> Back to store
              </Link>
              <button type="button" onClick={() => { setSheetOpen(false); onLogout(); }} className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-rose-200 text-sm font-medium text-rose-600 active:bg-rose-50">
                <LogOut size={16} aria-hidden="true" /> Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <nav aria-label={label} className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white pb-safe shadow-[0_-2px_12px_rgba(0,0,0,0.06)] md:hidden">
        <div className="flex h-14 items-stretch">
          {primary.map(({ to, label: text, Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => itemClass(isActive && !sheetOpen)}>
              <Icon size={24} strokeWidth={1.8} aria-hidden="true" />
              <span>{text}</span>
            </NavLink>
          ))}
          <button type="button" onClick={() => setSheetOpen(true)} className={itemClass(sheetOpen || moreActive)} aria-haspopup="dialog" aria-expanded={sheetOpen}>
            <Ellipsis size={24} strokeWidth={1.8} aria-hidden="true" />
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default PortalBottomNav;
