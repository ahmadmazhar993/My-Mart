import React, { useEffect, useMemo, useRef, useState } from 'react';
import { productService } from '../../services';
import { useToast } from '../../components/ToastProvider';
import BrandLoader from '../../components/BrandLoader';
import BrandLogo from '../../components/BrandLogo';

const emptyForm = { name: '', description: '', logo_url: '', is_featured: false };

const BrandModal = ({ brand, onClose, onSaved }) => {
  const isNew = !brand;
  const { addToast } = useToast();
  const [form, setForm] = useState(brand
    ? {
      name: brand.name,
      description: brand.description || '',
      logo_url: brand.logo_url || '',
      is_featured: Boolean(brand.is_featured),
    }
    : emptyForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleLogoFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const data = new FormData();
      data.append('name', form.name || 'brand'); // sent before the file so it can name it
      data.append('logo', file);
      const res = await productService.uploadBrandLogo(data);
      setForm((prev) => ({ ...prev, logo_url: res.data?.data || '' }));
    } catch (err) {
      setError(err.response?.data?.message || 'Could not upload the logo.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setError('Brand name is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const original = brand ? brand.name : name;
      await productService.updateBrand(original, {
        name,
        description: form.description,
        logo_url: form.logo_url,
        is_featured: form.is_featured,
      });
      addToast(isNew ? 'Brand added' : 'Brand updated', 'success');
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the brand.');
    } finally {
      setSaving(false);
    }
  };

  const preview = { name: form.name || 'Brand', logo_url: form.logo_url };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={isNew ? 'Add brand' : 'Edit brand'}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl animate-slide-up sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-base font-bold text-dark">{isNew ? 'Add brand' : 'Edit brand'}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <div className="flex items-center gap-4">
            <BrandLogo brand={preview} className="h-20 w-20 rounded-2xl" textClass="text-3xl" />
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60"
                >
                  {uploading ? 'Uploading…' : form.logo_url ? 'Change logo' : 'Upload logo'}
                </button>
                {form.logo_url && (
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, logo_url: '' }))}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, WEBP or SVG, up to 2 MB. A square logo on a transparent or white background looks best.</p>
              <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.webp,.svg,image/*" className="hidden" onChange={handleLogoFile} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="brand-name">Name <span className="text-red-500">*</span></label>
            <input
              id="brand-name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              maxLength={120}
              required
              className="input-field w-full"
              placeholder="e.g. Olivia"
            />
            {!isNew && <p className="mt-1 text-xs text-gray-500">Renaming also renames the brand on all its products.</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="brand-desc">Description</label>
            <textarea
              id="brand-desc"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              maxLength={600}
              rows={3}
              className="input-field w-full"
              placeholder="A short line about the brand (shown on the brands page)"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3">
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={(e) => setForm((prev) => ({ ...prev, is_featured: e.target.checked }))}
              className="h-4 w-4 accent-primary"
            />
            <span>
              <span className="block text-sm font-medium text-gray-800">Featured brand</span>
              <span className="block text-xs text-gray-500">Highlighted at the top of the brands page.</span>
            </span>
          </label>
        </div>

        <div className="flex gap-3 border-t border-gray-100 p-4">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={saving || uploading} className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-600 disabled:opacity-60">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};

const AdminBrands = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState({ open: false, brand: null });

  const load = () => {
    setLoading(true);
    productService.getBrandsAdmin()
      .then((res) => setBrands(res.data?.data || []))
      .catch(() => setError('Failed to load brands'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return brands.filter((b) => !needle || b.name.toLowerCase().includes(needle));
  }, [brands, query]);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white px-4 py-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-dark">Brands</h2>
          <p className="mt-0.5 text-sm text-gray-500">Add logos and descriptions for your brands</p>
        </div>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search brands"
            aria-label="Search brands"
            className="input-field w-full sm:w-56"
          />
          <button
            type="button"
            onClick={() => setModal({ open: true, brand: null })}
            className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Brand
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <BrandLoader minHeight={280} text="Loading brands" />
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-10 text-center shadow-card">
          <p className="text-sm text-gray-500">
            {brands.length === 0
              ? 'No brands yet. Set a Brand on a product, or add one here.'
              : 'No brands match your search.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((brand) => (
            <div key={brand.name} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-card">
              <BrandLogo brand={brand} className="h-14 w-14 rounded-xl" textClass="text-xl" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="line-clamp-2 break-words text-sm font-semibold leading-snug text-dark">{brand.name}</p>
                  {brand.is_featured && (
                    <span className="flex-shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">Featured</span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {brand.count} {brand.count === 1 ? 'product' : 'products'}
                  {!brand.logo_url && <span className="ml-2 text-amber-600">· No logo</span>}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModal({ open: true, brand })}
                className="flex-shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      )}

      {modal.open && (
        <BrandModal
          brand={modal.brand}
          onClose={() => setModal({ open: false, brand: null })}
          onSaved={() => { setModal({ open: false, brand: null }); load(); }}
        />
      )}
    </div>
  );
};

export default AdminBrands;
