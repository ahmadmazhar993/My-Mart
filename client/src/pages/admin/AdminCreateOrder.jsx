import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { orderService, productService, userService } from '../../services';
import { PAYMENT_METHOD_LABELS } from '../../config/paymentAccounts';

const emptyForm = {
  user_id: '',
  shipping_address: '',
  payment_method: 'cod',
};

const AdminCreateOrder = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [orderItems, setOrderItems] = useState([]);

  const selectedUser = users.find((user) => user.id === form.user_id);
  const filteredUsers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => [user.fullName, user.email, user.phone, user.id]
      .some((value) => String(value || '').toLowerCase().includes(query)));
  }, [customerSearch, users]);
  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) => [product.name, product.sku, product.id, ...(product.variants || []).flatMap((variant) => [variant.name, variant.label, variant.sku])]
      .some((value) => String(value || '').toLowerCase().includes(query)));
  }, [productSearch, products]);
  const total = orderItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

  useEffect(() => {
    Promise.all([
      userService.getAllUsers({ limit: 100 }),
      productService.getAllProducts({ limit: 100, forOrder: true }),
    ])
      .then(([usersResponse, productsResponse]) => {
        setUsers((usersResponse.data?.data || []).filter((user) => String(user.role || '').toLowerCase() === 'customer'));
        setProducts(productsResponse.data?.data || []);
      })
      .catch(() => setError('Users and products could not be loaded. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!form.user_id) {
      setAddresses([]);
      return;
    }
    setAddresses([]);
    userService.getAddressesForUser(form.user_id)
      .then((response) => setAddresses(response.data?.data || []))
      .catch(() => setError('Saved addresses could not be loaded for this customer.'));
  }, [form.user_id]);

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const selectAddress = (address) => {
    updateForm('shipping_address', [address.full_name, address.phone, address.address, address.city, address.postal_code]
      .filter(Boolean)
      .join(', '));
  };

  const addProduct = (product, variant = null) => {
    const variantKey = variant?.sku || variant?.name || variant?.label || '';
    const lineKey = `${product.id}-${variantKey}`;
    const stockQuantity = Number(variant?.stock_quantity ?? product.stock_quantity) || 0;
    const unitPrice = Number(variant?.discount_price ?? variant?.price ?? product.discount_price ?? product.price ?? 0);
    setOrderItems((current) => {
      const existing = current.find((item) => item.lineKey === lineKey);
      if (existing) {
        return current.map((item) => item.lineKey === lineKey
          ? { ...item, quantity: Math.min(item.quantity + 1, stockQuantity || item.quantity + 1) }
          : item);
      }
      return [...current, {
        product_id: product.id,
        lineKey,
        name: product.name,
        variant_name: variant?.name || null,
        variant_label: variant?.label || variant?.name || null,
        variant_sku: variant?.sku || null,
        quantity: 1,
        stockQuantity,
        unitPrice,
      }];
    });
    setProductSearch('');
  };

  const updateItemQuantity = (productId, quantity) => {
    setOrderItems((current) => current.map((item) => item.lineKey === productId
      ? { ...item, quantity: Math.max(1, Math.min(Number(quantity) || 1, item.stockQuantity || Number.MAX_SAFE_INTEGER)) }
      : item));
  };

  const changeItemQuantity = (lineKey, amount) => {
    setOrderItems((current) => current.map((item) => {
      if (item.lineKey !== lineKey) return item;
      const maximum = item.stockQuantity || Number.MAX_SAFE_INTEGER;
      return { ...item, quantity: Math.max(1, Math.min(item.quantity + amount, maximum)) };
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.user_id || !orderItems.length || !form.shipping_address.trim()) {
      setError('Select a customer, add at least one product, and complete the shipping address.');
      return;
    }

    setSaving(true);
    try {
      await orderService.createOrder({
        user_id: form.user_id,
        shipping_address: form.shipping_address.trim(),
        payment_method: form.payment_method,
        items: orderItems.map(({ product_id, variant_name, variant_label, variant_sku, quantity }) => ({
          product_id, variant_name, variant_label, variant_sku, quantity,
        })),
      });
      navigate('/admin/orders', { state: { orderCreated: true } });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Order could not be created. Please review the details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link to="/admin/orders" className="text-sm font-semibold text-primary hover:underline">← Back to orders</Link>
          <h2 className="mt-3 text-3xl font-bold text-dark">Create an order</h2>
          <p className="mt-1 text-sm text-gray-500">Place an order for a customer and send them a confirmation email automatically.</p>
        </div>
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary-dark">
          <span className="font-semibold">Admin order</span>
          <span className="ml-2">The customer will be notified by email.</span>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? <div className="rounded-xl border border-gray-200 bg-white p-8 text-sm text-gray-500">Loading order tools...</div> : (
        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Step 1</p>
                  <h3 className="mt-1 text-lg font-bold text-dark">Customer details</h3>
                </div>
                {selectedUser && <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Account selected</span>}
              </div>
              <div>
                <label htmlFor="customer-search" className="block text-sm font-semibold text-gray-700">Search customer</label>
                <div className="relative mt-2">
                  <input
                    id="customer-search"
                    type="search"
                    value={customerSearch}
                    onChange={(event) => setCustomerSearch(event.target.value)}
                    className="input-field w-full pr-10"
                    placeholder="Search by name, email, phone, or ID"
                    aria-label="Search customers"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">⌕</span>
                </div>
                <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white" role="listbox" aria-label="Customer results">
                  {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                    <button
                      type="button"
                      key={user.id}
                      role="option"
                      aria-selected={form.user_id === user.id}
                      onClick={() => {
                        updateForm('user_id', user.id);
                        setCustomerSearch(user.fullName || user.email || '');
                      }}
                      className={`block w-full border-b border-gray-100 px-3 py-2.5 text-left last:border-b-0 hover:bg-primary/5 ${form.user_id === user.id ? 'bg-primary/10' : ''}`}
                    >
                      <span className="block text-sm font-semibold text-gray-800">{user.fullName || 'Unnamed customer'}</span>
                      <span className="mt-0.5 block text-xs text-gray-500">{user.email}{user.phone ? ` · ${user.phone}` : ''}</span>
                    </button>
                  )) : (
                    <p className="px-3 py-3 text-sm text-gray-500" role="status">No customers match your search.</p>
                  )}
                </div>
                <input type="hidden" required value={form.user_id} aria-label="Selected customer" />
              </div>
              {selectedUser && (
                <div className="mt-4 grid gap-3 rounded-lg bg-gray-50 p-4 text-sm sm:grid-cols-2">
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Email</p><p className="mt-1 text-gray-800">{selectedUser.email}</p></div>
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Phone</p><p className="mt-1 text-gray-800">{selectedUser.phone || 'Not provided'}</p></div>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Step 2</p>
                <h3 className="mt-1 text-lg font-bold text-dark">Delivery details</h3>
              </div>
              {form.user_id && <>
                <p className="mb-2 text-sm font-semibold text-gray-700">Saved addresses</p>
                {addresses.length > 0 ? (
                  <div className="mb-4 grid gap-3 sm:grid-cols-2">
                    {addresses.map((address) => (
                      <button type="button" key={address.id} onClick={() => selectAddress(address)} className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-left transition hover:border-primary hover:bg-primary/5">
                        <span className="block text-sm font-bold text-gray-800">{address.label || 'Saved address'}</span>
                        <span className="mt-1 block text-xs leading-5 text-gray-600">{[address.full_name, address.phone, address.address, address.city, address.postal_code].filter(Boolean).join(', ')}</span>
                      </button>
                    ))}
                  </div>
                ) : <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">No saved address found. Enter the delivery details below.</p>}
              </>}
              <label className="block text-sm font-semibold text-gray-700">Shipping address
                <textarea required rows="4" value={form.shipping_address} onChange={(event) => updateForm('shipping_address', event.target.value)} className="input-field mt-2 w-full" placeholder="Full name, phone, street address, city, postal code" />
              </label>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Step 3</p>
                <h3 className="mt-1 text-lg font-bold text-dark">Order items and payment</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
                <div>
                  <label htmlFor="product-search" className="block text-sm font-semibold text-gray-700">Search and add products</label>
                  <div className="relative mt-2">
                    <input id="product-search" type="search" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} className="input-field w-full pr-10" placeholder="Search by product name, SKU, or ID" aria-label="Search products" />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">⌕</span>
                  </div>
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white" role="listbox" aria-label="Product results">
                    {filteredProducts.length > 0 ? filteredProducts.flatMap((product) => {
                      const variants = Array.isArray(product.variants) && product.variants.length ? product.variants : [null];
                      return variants.map((variant) => {
                        const variantKey = variant?.sku || variant?.name || variant?.label || '';
                        const optionKey = `${product.id}-${variantKey}`;
                        const variantLabel = variant?.label || variant?.name;
                        const stockQuantity = Number(variant?.stock_quantity ?? product.stock_quantity) || 0;
                        const price = Number(variant?.discount_price ?? variant?.price ?? product.discount_price ?? product.price ?? 0);
                        return (
                          <button type="button" key={optionKey} onClick={() => addProduct(product, variant)} className="flex w-full items-center justify-between border-b border-gray-100 px-3 py-2.5 text-left last:border-b-0 hover:bg-primary/5">
                            <span><span className="block text-sm font-semibold text-gray-800">{product.name}{variantLabel ? ` - ${variantLabel}` : ''}</span><span className="block text-xs text-gray-500">{stockQuantity} in stock {variant?.sku || product.sku ? `· ${variant?.sku || product.sku}` : ''}</span></span>
                            <span className="text-sm font-semibold text-gray-800">Rs. {price.toLocaleString()}</span>
                          </button>
                        );
                      });
                    }) : <p className="px-3 py-3 text-sm text-gray-500">No products or variants match your search.</p>}
                  </div>
                </div>
                <label className="block text-sm font-semibold text-gray-700">Payment method
                  <select value={form.payment_method} onChange={(event) => updateForm('payment_method', event.target.value)} className="input-field mt-2 w-full">
                    <option value="cod">Cash on Delivery</option>
                    <option value="online">Online payment</option>
                  </select>
                </label>
              </div>
              <div className="mt-5 space-y-3">
                {orderItems.length > 0 ? orderItems.map((item) => (
                  <div key={item.lineKey} className="grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:grid-cols-[minmax(0,1fr)_132px_96px_auto] sm:items-center sm:gap-4">
                    <div className="min-w-0"><p className="break-words text-sm font-semibold leading-5 text-gray-800">{item.name}{item.variant_label ? ` - ${item.variant_label}` : ''}</p><p className="text-xs text-gray-500">Rs. {item.unitPrice.toLocaleString()} each · {item.stockQuantity} available{item.variant_sku ? ` · ${item.variant_sku}` : ''}</p></div>
                    <div className="flex items-center gap-2 sm:justify-center">
                      <span className="text-xs font-semibold text-gray-500">Qty</span>
                      <div className="flex h-9 items-center overflow-hidden rounded-md border border-gray-300 bg-white">
                        <button type="button" onClick={() => changeItemQuantity(item.lineKey, -1)} disabled={item.quantity <= 1} className="flex h-full w-8 items-center justify-center text-lg font-semibold text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Decrease quantity for ${item.name}`}>-</button>
                        <input type="number" min="1" max={item.stockQuantity || undefined} value={item.quantity} onChange={(event) => updateItemQuantity(item.lineKey, event.target.value)} className="h-full w-10 border-x border-gray-200 bg-white p-0 text-center text-sm font-semibold text-gray-800 focus:border-primary focus:outline-none" aria-label={`Quantity for ${item.name}${item.variant_label ? ` ${item.variant_label}` : ''}`} />
                        <button type="button" onClick={() => changeItemQuantity(item.lineKey, 1)} disabled={item.stockQuantity > 0 && item.quantity >= item.stockQuantity} className="flex h-full w-8 items-center justify-center text-lg font-semibold text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Increase quantity for ${item.name}`}>+</button>
                      </div>
                    </div>
                    <span className="text-left text-sm font-bold text-gray-800 sm:text-right">Rs. {(item.unitPrice * item.quantity).toLocaleString()}</span>
                    <button type="button" onClick={() => setOrderItems((current) => current.filter((line) => line.lineKey !== item.lineKey))} className="w-fit text-sm font-semibold text-red-600 hover:underline sm:justify-self-end" aria-label={`Remove ${item.name}`}>Remove</button>
                    </div>
                )) : <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">No products added yet. Search above and select products for this order.</p>}
              </div>
            </section>
          </div>

          <aside className="h-fit rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Final review</p>
            <h3 className="mt-1 text-xl font-bold text-dark">Order summary</h3>
            <div className="mt-5 space-y-4 border-y border-gray-100 py-4 text-sm">
              <div className="flex justify-between gap-4"><span className="text-gray-500">Customer</span><span className="text-right font-semibold text-gray-800">{selectedUser?.fullName || 'Not selected'}</span></div>
              <div className="flex justify-between gap-4"><span className="text-gray-500">Products</span><span className="text-right font-semibold text-gray-800">{orderItems.length || 'None selected'}</span></div>
              <div className="space-y-2">{orderItems.map((item) => <div key={item.lineKey} className="flex justify-between gap-4 text-xs"><span className="max-w-[190px] text-gray-500">{item.name}{item.variant_label ? ` - ${item.variant_label}` : ''} × {item.quantity}</span><span className="font-semibold text-gray-800">Rs. {(item.unitPrice * item.quantity).toLocaleString()}</span></div>)}</div>
              <div className="flex justify-between gap-4"><span className="text-gray-500">Payment</span><span className="font-semibold text-gray-800">{PAYMENT_METHOD_LABELS[form.payment_method]}</span></div>
              <div className="flex justify-between gap-4"><span className="text-gray-500">Shipping</span><span className="max-w-[190px] text-right font-semibold text-gray-800">{form.shipping_address || 'Not entered'}</span></div>
            </div>
            <div className="flex items-end justify-between py-4"><span className="font-semibold text-gray-600">Estimated total</span><span className="text-2xl font-bold text-dark">Rs. {total.toLocaleString()}</span></div>
            <button type="submit" disabled={saving || !selectedUser || !orderItems.length} className="btn-primary w-full py-3 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Creating order...' : 'Create order and notify customer'}</button>
            <p className="mt-3 text-center text-xs leading-5 text-gray-500">The customer will receive the order number, items, address, payment method, and total by email.</p>
          </aside>
        </form>
      )}
    </div>
  );
};

export default AdminCreateOrder;
