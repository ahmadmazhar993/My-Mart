import React, { useEffect, useRef, useState } from 'react';
import { sellerPortalService } from '../../services';
import { useToast } from '../../components/ToastProvider';
import {
  Button, Card, ErrorState, Field, Loading, PageHeader, StatusBadge, apiError, formatDate, imageSrc,
} from '../../components/seller/ui';

const PHONE = /^\+?[0-9][0-9\s-]{6,18}$/;

const SellerStoreSettings = () => {
  const { addToast } = useToast();
  const fileRef = useRef(null);
  const [seller, setSeller] = useState(null);
  const [form, setForm] = useState({
    shop_description: '', contact_phone: '', business_address: '', notify_new_order: true, notify_returns: true, notify_payouts: true,
  });
  const [errors, setErrors] = useState({});
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const apply = (data) => {
    setSeller(data);
    setForm({
      shop_description: data.shop_description || '',
      contact_phone: data.contact_phone || '',
      business_address: data.business_address || '',
      notify_new_order: data.notifications?.new_order !== false,
      notify_returns: data.notifications?.returns !== false,
      notify_payouts: data.notifications?.payouts !== false,
    });
  };

  useEffect(() => {
    sellerPortalService.getProfile()
      .then((res) => apply(res.data.data))
      .catch((err) => setLoadError(apiError(err, 'Could not load your store.')));
  }, []);

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const save = async (event) => {
    event.preventDefault();
    if (saving) return;
    const found = {};
    if (!PHONE.test(form.contact_phone.trim())) found.contact_phone = 'Enter a valid phone number.';
    if (form.shop_description.length > 1000) found.shop_description = 'Keep the description under 1000 characters.';
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      const res = await sellerPortalService.updateProfile(form);
      apply(res.data.data);
      addToast('Store settings saved.');
    } catch (err) {
      setErrors(err.response?.data?.errors || {});
      addToast(apiError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const onLogo = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const res = await sellerPortalService.uploadLogo(file);
      apply(res.data.data);
      addToast('Logo updated.');
    } catch (err) {
      addToast(apiError(err, 'Logo upload failed.'), 'error');
    } finally {
      setUploading(false);
    }
  };

  if (loadError) return <ErrorState message={loadError} />;
  if (!seller) return <Loading text="Loading store settings" />;

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader title="Store settings" subtitle="How your store appears and how we reach you." />

      <div className="grid gap-4 lg:grid-cols-3">
        <form onSubmit={save} noValidate className="space-y-4 lg:col-span-2">
          <Card title="Email notifications">
            <fieldset>
              <legend className="sr-only">Choose which emails you receive</legend>
              <div className="space-y-3">
                {[['notify_new_order', 'New orders', 'When a customer orders one of your products'], ['notify_returns', 'Returns', 'Return requests, decisions and refunds'], ['notify_payouts', 'Payouts', 'When a payout request is paid, rejected or fails']].map(([key, label, hint]) => (
                  <label key={key} className="flex items-start gap-3 text-sm">
                    <input type="checkbox" checked={form[key]} onChange={(e) => set(key, e.target.checked)} className="mt-1 h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary" />
                    <span><span className="font-medium text-gray-800">{label}</span><span className="block text-xs text-gray-500">{hint}</span></span>
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="mt-3 text-xs text-gray-400">Emails go to your account email. Save changes below to apply.</p>
          </Card>

          <Card title="Store details">
            <div className="space-y-4">
              <Field label="Store name" hint="The store name can only be changed by AHM Mart staff. Contact support if it needs updating.">
                <p className="input-field bg-gray-50 text-gray-700">{seller.shop_name}</p>
              </Field>
              <Field label="Description" htmlFor="s-desc" error={errors.shop_description}>
                <textarea id="s-desc" rows={4} maxLength={1000} className="input-field" value={form.shop_description} onChange={(e) => set('shop_description', e.target.value)} />
              </Field>
              <Field label="Contact phone *" htmlFor="s-phone" error={errors.contact_phone}>
                <input id="s-phone" inputMode="tel" className="input-field" value={form.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} />
              </Field>
              <Field label="Business address" htmlFor="s-addr" error={errors.business_address} hint="Used for pickup and correspondence. Not shown to customers.">
                <textarea id="s-addr" rows={2} maxLength={300} className="input-field" value={form.business_address} onChange={(e) => set('business_address', e.target.value)} />
              </Field>
            </div>
            <div className="mt-5 flex justify-end">
              <Button type="submit" busy={saving}>Save changes</Button>
            </div>
          </Card>
        </form>

        <div className="space-y-4">
          <Card title="Store logo">
            <div className="flex items-center gap-4">
              {seller.shop_logo_url
                ? <img src={imageSrc(seller.shop_logo_url)} alt="Store logo" className="h-20 w-20 rounded-xl border border-gray-100 object-cover" />
                : <span className="flex h-20 w-20 items-center justify-center rounded-xl bg-primary-50 text-2xl font-bold text-primary">{seller.shop_name[0]}</span>}
              <div>
                <Button variant="outline" busy={uploading} onClick={() => fileRef.current?.click()} className="!px-3 !py-2">Upload logo</Button>
                <p className="mt-1 text-xs text-gray-400">JPG, PNG or WEBP, up to 2 MB.</p>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onLogo} aria-label="Upload store logo" />
          </Card>

          <Card title="Account">
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between"><dt className="text-gray-500">Status</dt><dd><StatusBadge status={seller.status} /></dd></div>
              <div className="flex items-center justify-between"><dt className="text-gray-500">Seller since</dt><dd>{formatDate(seller.approved_on || seller.applied_on)}</dd></div>
              <div className="flex items-center justify-between"><dt className="text-gray-500">Applied</dt><dd>{formatDate(seller.applied_on)}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-gray-400">Status is set by AHM Mart staff after reviewing your application.</p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SellerStoreSettings;
