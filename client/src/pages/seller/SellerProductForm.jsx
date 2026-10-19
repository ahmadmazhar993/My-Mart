import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { sellerPortalService } from '../../services';
import { useToast } from '../../components/ToastProvider';
import {
  Button, Card, ErrorState, Field, Loading, PageHeader, StatusBadge, apiError, imageSrc,
} from '../../components/seller/ui';
import { Select } from '../../components/seller/filters';

const EMPTY = {
  name: '', description: '', category_id: '', price: '', discount_price: '', stock_quantity: '0', sku: '', images: [], variants: [],
};
const MAX_IMAGES = 10;

const blankVariant = () => ({
  name: '', price: '', discount_price: '', stock_quantity: '', sku: '',
});

const toForm = (product) => ({
  name: product.name || '',
  description: product.description || '',
  category_id: product.category_id || '',
  price: String(product.price ?? ''),
  discount_price: product.discount_price != null ? String(product.discount_price) : '',
  stock_quantity: String(product.stock_quantity ?? 0),
  sku: product.sku || '',
  images: product.images || [],
  variants: (product.variants || []).map((v) => ({
    name: v.name || '',
    price: v.price != null ? String(v.price) : '',
    discount_price: v.discount_price != null ? String(v.discount_price) : '',
    stock_quantity: v.stock_quantity != null ? String(v.stock_quantity) : '',
    sku: v.sku || '',
    image: v.image || '',
    saved: true, // existing variant: its stock is managed in Inventory
  })),
});

const numberOrNull = (value) => (value === '' || value == null ? null : Number(value));

const validate = (form, { isEdit }) => {
  const errors = {};
  if (form.name.trim().length < 3) errors.name = 'Product name must be at least 3 characters.';
  if (!form.category_id) errors.category_id = 'Please choose a category.';
  const price = Number(form.price);
  if (form.price === '' || !(price > 0)) errors.price = 'Enter a price greater than 0.';
  if (form.discount_price !== '') {
    const discount = Number(form.discount_price);
    if (!(discount >= 0) || (price > 0 && discount >= price)) errors.discount_price = 'Discount price must be lower than the price.';
  }
  if (!isEdit && (!/^\d+$/.test(String(form.stock_quantity)))) errors.stock_quantity = 'Stock must be a whole number of 0 or more.';
  form.variants.forEach((variant, index) => {
    if (!variant.name.trim()) errors.variants = `Variant ${index + 1} needs a name.`;
    else if (variant.stock_quantity !== '' && !/^\d+$/.test(variant.stock_quantity)) errors.variants = `Variant ${index + 1}: stock must be a whole number.`;
  });
  return errors;
};

const SellerProductForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { addToast } = useToast();
  const fileRef = useRef(null);

  const [form, setForm] = useState(EMPTY);
  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      sellerPortalService.getCategories(),
      isEdit ? sellerPortalService.getProduct(id) : Promise.resolve(null),
    ])
      .then(([cats, prod]) => {
        if (cancelled) return;
        setCategories(cats.data.data);
        if (prod) {
          setProduct(prod.data.data);
          setForm(toForm(prod.data.data));
        }
      })
      .catch((err) => !cancelled && setLoadError(apiError(err, 'Could not load this product.')))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [id, isEdit]);

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const setVariant = (index, key, value) => {
    setForm((f) => ({ ...f, variants: f.variants.map((v, i) => (i === index ? { ...v, [key]: value } : v)) }));
    setErrors((e) => ({ ...e, variants: undefined }));
  };

  const onPickImages = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    if (form.images.length + files.length > MAX_IMAGES) {
      addToast(`You can add up to ${MAX_IMAGES} images.`, 'error');
      return;
    }
    setUploading(true);
    try {
      const res = await sellerPortalService.uploadProductImages(files);
      set('images', [...form.images, ...res.data.data]);
    } catch (err) {
      addToast(apiError(err, 'Image upload failed.'), 'error');
    } finally {
      setUploading(false);
    }
  };

  const payload = () => ({
    name: form.name.trim(),
    description: form.description.trim(),
    category_id: form.category_id,
    price: Number(form.price),
    discount_price: numberOrNull(form.discount_price),
    sku: form.sku.trim(),
    images: form.images,
    variants: form.variants.map((v) => ({
      name: v.name.trim(),
      price: numberOrNull(v.price),
      discount_price: numberOrNull(v.discount_price),
      stock_quantity: numberOrNull(v.stock_quantity),
      sku: v.sku.trim(),
      image: v.image || '',
    })),
  });

  const save = async ({ submit }) => {
    if (saving) return;
    const found = validate(form, { isEdit });
    setErrors(found);
    if (Object.keys(found).length) {
      addToast(Object.values(found)[0], 'error');
      return;
    }
    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        const res = await sellerPortalService.updateProduct(id, payload());
        saved = res.data.data;
        addToast(res.data.message || 'Product updated.');
        if (submit && ['draft', 'rejected'].includes(saved.approval_status)) {
          await sellerPortalService.submitProduct(id);
          addToast('Submitted for review.');
        }
      } else {
        const res = await sellerPortalService.createProduct({ ...payload(), stock_quantity: Number(form.stock_quantity), submit });
        saved = res.data.data;
        addToast(submit ? 'Product submitted for review.' : 'Draft saved.');
      }
      navigate('/seller/products');
    } catch (err) {
      setErrors(err.response?.data?.errors || {});
      addToast(apiError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading text="Loading product" />;
  if (loadError) return <ErrorState message={loadError} />;
  if (isEdit && product?.approval_status === 'archived') {
    return <ErrorState message="Archived products cannot be edited." />;
  }

  const status = product?.approval_status;
  const isLive = status === 'approved';
  const canSubmit = !isEdit || ['draft', 'rejected'].includes(status);

  return (
    <form
      className="animate-fade-in space-y-5"
      noValidate
      onSubmit={(event) => { event.preventDefault(); save({ submit: false }); }}
    >
      <PageHeader
        title={isEdit ? 'Edit product' : 'New product'}
        subtitle={isEdit ? undefined : 'Save a draft any time. Products go live only after our team approves them.'}
        actions={status ? <StatusBadge status={status} /> : null}
      />

      {status === 'rejected' && product.rejection_reason ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <strong>Not approved:</strong> {product.rejection_reason}. Fix the issue below and resubmit.
        </div>
      ) : null}
      {isLive ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          This product is approved. Changing its name, description, category, price or images sends it back for review and hides it from the store until it is re-approved.
          Use <Link to="/seller/inventory" className="font-semibold underline">Inventory</Link> to change stock without review.
        </div>
      ) : null}

      <Card title="Basic information">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Product name *" htmlFor="p-name" error={errors.name}>
              <input id="p-name" className="input-field" maxLength={200} value={form.name} onChange={(e) => set('name', e.target.value)} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Description" htmlFor="p-desc" error={errors.description} hint="Materials, sizes, what is in the box, care instructions, delivery notes.">
              <textarea id="p-desc" rows={5} maxLength={5000} className="input-field" value={form.description} onChange={(e) => set('description', e.target.value)} />
            </Field>
          </div>
          <Field label="Category *" htmlFor="p-cat" error={errors.category_id}>
            <Select id="p-cat" value={form.category_id} onChange={(e) => set('category_id', e.target.value)}>
              <option value="">Select a category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.parent_id ? '— ' : ''}{c.name}</option>)}
            </Select>
          </Field>
          <Field label="SKU" htmlFor="p-sku" error={errors.sku} hint="Optional. Must be unique across AHM Mart.">
            <input id="p-sku" className="input-field" maxLength={100} value={form.sku} onChange={(e) => set('sku', e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card title="Pricing and stock">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Price (Rs.) *" htmlFor="p-price" error={errors.price}>
            <input id="p-price" inputMode="decimal" className="input-field" value={form.price} onChange={(e) => set('price', e.target.value.replace(/[^\d.]/g, ''))} />
          </Field>
          <Field label="Discount price (Rs.)" htmlFor="p-disc" error={errors.discount_price} hint="Leave empty for no discount.">
            <input id="p-disc" inputMode="decimal" className="input-field" value={form.discount_price} onChange={(e) => set('discount_price', e.target.value.replace(/[^\d.]/g, ''))} />
          </Field>
          {isEdit ? (
            <Field label="Stock">
              <p className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm">
                <strong>{product.stock_quantity}</strong> in stock · <Link to="/seller/inventory" className="font-semibold text-primary underline">Update in Inventory</Link>
              </p>
            </Field>
          ) : (
            <Field label="Opening stock *" htmlFor="p-stock" error={errors.stock_quantity}>
              <input id="p-stock" inputMode="numeric" className="input-field" value={form.stock_quantity} onChange={(e) => set('stock_quantity', e.target.value.replace(/\D/g, ''))} />
            </Field>
          )}
        </div>
      </Card>

      <Card title={`Images (${form.images.length}/${MAX_IMAGES})`}>
        {errors.images ? <p role="alert" className="mb-2 text-sm text-rose-600">{errors.images}</p> : null}
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {form.images.map((path, index) => (
            <li key={path} className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200">
              <img src={imageSrc(path)} alt={`Product image ${index + 1}`} className="h-full w-full object-cover" />
              {index === 0 ? <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-white">Main</span> : null}
              <button
                type="button"
                aria-label={`Remove image ${index + 1}`}
                onClick={() => set('images', form.images.filter((p) => p !== path))}
                className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                ✕
              </button>
            </li>
          ))}
          {form.images.length < MAX_IMAGES ? (
            <li>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                aria-busy={uploading}
                className="flex aspect-square w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-xs text-gray-500 transition hover:border-primary hover:text-primary disabled:opacity-60"
              >
                {uploading ? 'Uploading…' : <><span className="text-2xl leading-none">+</span>Add image</>}
              </button>
            </li>
          ) : null}
        </ul>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={onPickImages} aria-label="Upload product images" />
        <p className="mt-2 text-xs text-gray-400">JPG, PNG or WEBP, up to 6 MB each. The first image is the main one.</p>
      </Card>

      <Card
        title="Variants (optional)"
        action={form.variants.length < 30 ? <Button variant="outline" onClick={() => set('variants', [...form.variants, blankVariant()])} className="!px-3 !py-2">Add variant</Button> : null}
      >
        {errors.variants ? <p role="alert" className="mb-2 text-sm text-rose-600">{errors.variants}</p> : null}
        {form.variants.length === 0 ? (
          <p className="text-sm text-gray-500">Add variants for sizes, colours or other options. Leave a price empty to use the product price.</p>
        ) : (
          <div className="space-y-3">
            {form.variants.map((variant, index) => (
              <div key={index} className="grid grid-cols-2 gap-3 rounded-lg border border-gray-100 p-3 sm:grid-cols-6">
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor={`v-name-${index}`}>Name *</label>
                  <input id={`v-name-${index}`} className="input-field !py-2" placeholder="e.g. Large / Red" value={variant.name} onChange={(e) => setVariant(index, 'name', e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor={`v-price-${index}`}>Price</label>
                  <input id={`v-price-${index}`} inputMode="decimal" className="input-field !py-2" value={variant.price} onChange={(e) => setVariant(index, 'price', e.target.value.replace(/[^\d.]/g, ''))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor={`v-disc-${index}`}>Discount</label>
                  <input id={`v-disc-${index}`} inputMode="decimal" className="input-field !py-2" value={variant.discount_price} onChange={(e) => setVariant(index, 'discount_price', e.target.value.replace(/[^\d.]/g, ''))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor={`v-stock-${index}`}>Stock</label>
                  <input
                    id={`v-stock-${index}`}
                    inputMode="numeric"
                    className="input-field !py-2 disabled:bg-gray-50"
                    value={variant.stock_quantity}
                    disabled={isEdit && variant.saved}
                    title={isEdit && variant.saved ? 'Change stock of saved variants in Inventory' : undefined}
                    onChange={(e) => setVariant(index, 'stock_quantity', e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={() => set('variants', form.variants.filter((_, i) => i !== index))} aria-label={`Remove variant ${index + 1}`} className="w-full !py-2 !text-rose-600">Remove</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="sticky bottom-14 -mx-4 flex flex-col-reverse gap-2 border-t border-gray-200 bg-white/95 p-4 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:bg-transparent sm:p-0">
        <Link to="/seller/products" className="btn-outline !justify-center !px-4 !py-2.5 text-center text-sm">Cancel</Link>
        <Button variant="outline" busy={saving} onClick={() => save({ submit: false })}>{isEdit ? 'Save changes' : 'Save as draft'}</Button>
        {canSubmit ? <Button busy={saving} onClick={() => save({ submit: true })}>Save &amp; submit for review</Button> : null}
      </div>
    </form>
  );
};

export default SellerProductForm;
