import React, { useEffect, useState } from 'react';
import useLiveRefresh from '../../hooks/useLiveRefresh';
import { Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { sellerPortalService } from '../../services';
import { useToast } from '../../components/ToastProvider';
import {
  Button, ErrorState, Field, Loading, StatusBadge, apiError,
} from '../../components/seller/ui';

const PHONE = /^\+?[0-9][0-9\s-]{6,18}$/;

const Shell = ({ children }) => (
  <div className="container-main mx-auto max-w-2xl px-4 py-8 sm:py-12">{children}</div>
);

const Confirmation = ({ seller }) => (
  <Shell>
    <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-card sm:p-10">
      <StatusBadge status={seller.status} />
      <h1 className="mt-4 text-2xl font-bold text-dark">
        {seller.status === 'pending' ? 'Application received' : 'Seller application'}
      </h1>
      <p className="mt-2 text-gray-600">
        Thank you for applying with <strong>{seller.shop_name}</strong>.
      </p>
      <ol className="mx-auto mt-6 max-w-md space-y-2 text-left text-sm text-gray-600">
        <li><strong>1.</strong> Our team reviews your application.</li>
        <li><strong>2.</strong> Once approved, you can sign in to the Seller Centre and add products. Approval is never automatic.</li>
        <li><strong>3.</strong> New products are reviewed before they appear on the store.</li>
      </ol>
      <p className="mt-4 text-xs text-gray-400">Your shopper account is unchanged and keeps working as normal in the meantime.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/seller/dashboard" className="btn-primary !px-5 !py-2.5 text-sm">Check application status</Link>
        <Link to="/" className="btn-outline !px-5 !py-2.5 text-sm">Back to store</Link>
      </div>
    </div>
  </Shell>
);

const SellerApply = () => {
  const { isAuthenticated } = useAuthStore();
  const { addToast } = useToast();
  const [existing, setExisting] = useState(null);
  const [checking, setChecking] = useState(true);
  const [checkError, setCheckError] = useState('');
  const [submitted, setSubmitted] = useState(null);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState(null);
  const [liveTick, setLiveTick] = useState(0);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    shop_name: '', shop_description: '', contact_phone: '', business_address: '', accept_terms: false,
  });

  useEffect(() => {
    // Shown only if the live configuration loads; never a guessed rate.
    sellerPortalService.getFeePolicy().then((res) => setPolicy(res.data.data)).catch(() => setPolicy(null));
  }, []);

  // Approval / rejection by an admin shows up here without a reload.
  useLiveRefresh(['seller'], () => setLiveTick((t) => t + 1), { enabled: isAuthenticated });
  useLiveRefresh(['commission'], () => sellerPortalService.getFeePolicy().then((res) => setPolicy(res.data.data)).catch(() => {}));

  useEffect(() => {
    if (!isAuthenticated) return;
    sellerPortalService.getMyStatus()
      .then((res) => {
        const { status, seller } = res.data.data;
        if (seller) {
          setExisting({ status, seller });
          if (status === 'rejected') {
            setForm((f) => ({
              ...f,
              shop_name: seller.shop_name || '',
              shop_description: seller.shop_description || '',
              contact_phone: seller.contact_phone || '',
              business_address: seller.business_address || '',
            }));
          }
        }
      })
      .catch((err) => setCheckError(apiError(err, 'Could not check your application.')))
      .finally(() => setChecking(false));
  }, [isAuthenticated, liveTick]);

  if (!isAuthenticated) return <Navigate to="/login?redirect=/seller/apply" replace />;
  if (checking) return <Shell><Loading text="Loading" minHeight={300} /></Shell>;
  if (checkError) return <Shell><ErrorState message={checkError} /></Shell>;
  if (submitted && !(existing && existing.status !== 'rejected')) return <Confirmation seller={submitted} />;
  if (existing && existing.status !== 'rejected') {
    if (existing.status === 'approved') return <Navigate to="/seller/dashboard" replace />;
    return <Confirmation seller={existing.seller} />;
  }

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    const found = {};
    if (form.shop_name.trim().length < 3) found.shop_name = 'Store name must be at least 3 characters.';
    if (!PHONE.test(form.contact_phone.trim())) found.contact_phone = 'Enter a valid phone number.';
    if (!form.accept_terms) found.accept_terms = 'Please confirm to continue.';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      const res = await sellerPortalService.apply({
        ...form, shop_name: form.shop_name.trim(), contact_phone: form.contact_phone.trim(),
      });
      setSubmitted(res.data.data);
      addToast('Application submitted.');
    } catch (err) {
      setErrors(err.response?.data?.errors || {});
      addToast(apiError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell>
      <h1 className="text-3xl font-extrabold tracking-tight text-dark">Sell on AHM Mart</h1>
      <p className="mt-2 text-gray-600">Tell us about your store. Our team reviews every application before a seller account is activated.</p>

      {existing?.status === 'rejected' ? (
        <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Your previous application was not approved{existing.seller.rejection_reason ? `: ${existing.seller.rejection_reason}` : '.'} You can update your details and apply again.
        </div>
      ) : null}

      {policy ? (
        <section aria-label="Seller fees" className="mt-6 rounded-2xl border border-primary-100 bg-primary-50/60 p-5">
          <h2 className="font-bold text-dark">Seller fees</h2>
          <ul className="mt-2 space-y-1 text-sm text-gray-700">
            {policy.registration_fee === 0 ? <li>✓ Registration is free</li> : null}
            {policy.monthly_fee === 0 ? <li>✓ No monthly subscription fee</li> : null}
            {policy.listing_fee === 0 ? <li>✓ Product listings are free</li> : null}
            <li>✓ {policy.commission_percent}% sales commission, calculated on the {policy.commission_base}</li>
            {!policy.delivery_charges_in_commission ? <li>✓ Delivery charges are not charged commission</li> : null}
            <li>✓ Cancelled orders are not charged; refunds reverse the matching commission</li>
          </ul>
        </section>
      ) : null}

      <form onSubmit={submit} noValidate className="mt-6 space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-card sm:p-6">
        <Field label="Store name *" htmlFor="a-name" error={errors.shop_name} hint="Shown on your products. Must be unique.">
          <input id="a-name" className="input-field" maxLength={80} value={form.shop_name} onChange={(e) => set('shop_name', e.target.value)} />
        </Field>
        <Field label="What will you sell?" htmlFor="a-desc" error={errors.shop_description}>
          <textarea id="a-desc" rows={4} maxLength={1000} className="input-field" value={form.shop_description} onChange={(e) => set('shop_description', e.target.value)} />
        </Field>
        <Field label="Contact phone *" htmlFor="a-phone" error={errors.contact_phone}>
          <input id="a-phone" inputMode="tel" className="input-field" placeholder="03XX XXXXXXX" value={form.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} />
        </Field>
        <Field label="Business address" htmlFor="a-addr" error={errors.business_address} hint="Optional. Used for pickup and correspondence.">
          <textarea id="a-addr" rows={2} maxLength={300} className="input-field" value={form.business_address} onChange={(e) => set('business_address', e.target.value)} />
        </Field>
        <div>
          <label className="flex items-start gap-3 text-sm text-gray-700">
            <input type="checkbox" checked={form.accept_terms} onChange={(e) => set('accept_terms', e.target.checked)} className="mt-1 h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary" />
            <span>I confirm the information above is accurate and I have read how <Link to="/pages/sell" className="font-semibold text-primary underline">selling on AHM Mart</Link> works.</span>
          </label>
          {errors.accept_terms ? <p role="alert" className="mt-1 text-xs font-medium text-rose-600">{errors.accept_terms}</p> : null}
        </div>
        <Button type="submit" busy={saving} className="w-full">Submit application</Button>
      </form>
    </Shell>
  );
};

export default SellerApply;
