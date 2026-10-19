import React, { useCallback, useEffect, useState } from 'react';
import useLiveRefresh from '../../hooks/useLiveRefresh';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { sellerPortalService } from '../../services';
import { ErrorState, Loading, apiError } from './ui';

const Notice = ({ title, children, action }) => (
  <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
    <h1 className="text-2xl font-bold text-dark">{title}</h1>
    <div className="mt-3 space-y-2 text-sm text-gray-600">{children}</div>
    <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>
  </div>
);

/**
 * UX gate only. The server independently enforces seller approval on every
 * /seller/* request, so tampering with this component grants nothing.
 */
const RequireSeller = () => {
  const location = useLocation();
  const { isAuthenticated, user, setUser } = useAuthStore();
  const [state, setState] = useState({ loading: true, error: '', data: null });

  const load = useCallback((silent = false) => {
    if (!silent) setState((s) => ({ ...s, loading: true, error: '' }));
    return sellerPortalService.getMyStatus()
      .then((res) => setState({ loading: false, error: '', data: res.data.data }))
      .catch((err) => { if (!silent) setState({ loading: false, error: apiError(err, 'Could not check your seller account.'), data: null }); });
  }, []);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);
  // An approval, suspension or rejection takes effect on screen immediately.
  useLiveRefresh(['seller'], () => load(true), { enabled: isAuthenticated });

  const approved = state.data?.status === 'approved';
  useEffect(() => {
    // The stored role is only set at login; refresh it once approval is confirmed.
    if (approved && user && user.role !== 'Seller' && user.role !== 'Admin') {
      setUser({ ...user, role: 'Seller' });
    }
  }, [approved, user, setUser]);

  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  if (state.loading) return <Loading text="Checking your seller account" minHeight={400} />;
  if (state.error) return <div className="mx-auto max-w-lg p-6"><ErrorState message={state.error} onRetry={load} /></div>;

  const { status, seller } = state.data;

  if (status === 'approved') return <Outlet context={{ seller }} />;

  const storeLink = <Link to="/" className="btn-outline !px-4 !py-2.5 text-sm">Back to store</Link>;

  if (status === 'pending') {
    return (
      <Notice title="Application under review" action={storeLink}>
        <p>Thanks for applying with <strong>{seller.shop_name}</strong>. Our team is reviewing your application.</p>
        <p>You will get access to the seller dashboard as soon as it is approved. You cannot list products or manage orders until then.</p>
      </Notice>
    );
  }
  if (status === 'rejected') {
    return (
      <Notice
        title="Application not approved"
        action={<><Link to="/seller/apply" className="btn-primary !px-4 !py-2.5 text-sm">Update and re-apply</Link>{storeLink}</>}
      >
        <p>Your application for <strong>{seller.shop_name}</strong> was not approved.</p>
        {seller.rejection_reason ? <p className="rounded-lg bg-rose-50 p-3 text-rose-700">Reason: {seller.rejection_reason}</p> : null}
      </Notice>
    );
  }
  if (status === 'suspended') {
    return (
      <Notice title="Seller account suspended" action={<><Link to="/pages/contact?topic=seller" className="btn-primary !px-4 !py-2.5 text-sm">Contact support</Link>{storeLink}</>}>
        <p>Your seller account <strong>{seller.shop_name}</strong> is currently suspended and your products are hidden.</p>
        {seller.suspended_reason ? <p className="rounded-lg bg-rose-50 p-3 text-rose-700">Reason: {seller.suspended_reason}</p> : null}
      </Notice>
    );
  }
  return (
    <Notice title="You are not a seller yet" action={<><Link to="/seller/apply" className="btn-primary !px-4 !py-2.5 text-sm">Apply to sell</Link>{storeLink}</>}>
      <p>Apply to open a store on AHM Mart. Applications are reviewed by our team before you can list products.</p>
    </Notice>
  );
};

export default RequireSeller;
