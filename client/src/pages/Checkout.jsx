import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import ProductImage from '../components/ProductImage';
import { Breadcrumb } from '../components/ui';
import { ONLINE_PAYMENT_ACCOUNTS, PAYMENT_METHOD_LABELS } from '../config/paymentAccounts';
import { orderService, userService } from '../services';
import { useAuthStore, useCartStore } from '../store';
import { formatPrice } from '../utils/format';

const CITY_OPTIONS = [
  'Karachi',
  'Lahore',
  'Islamabad',
];

const getPaymentIcon = (type) => {
  switch (type) {
    case 'Bank':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 8.5L12 4l9 4.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 9v8" strokeLinecap="round" />
          <path d="M19 9v8" strokeLinecap="round" />
          <path d="M9 17v-4h6v4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'Easypaisa':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="4" y="5" width="16" height="14" rx="2.5" />
          <path d="M8 10h8" strokeLinecap="round" />
          <path d="M8 14h5" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 7h16" strokeLinecap="round" />
          <path d="M4 12h16" strokeLinecap="round" />
          <path d="M4 17h10" strokeLinecap="round" />
        </svg>
      );
  }
};

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();
  const { cart, clearCart, buyNowItems, clearBuyNowItems } = useCartStore();

  const isBuyNow = new URLSearchParams(location.search).get('mode') === 'buynow';
  const checkoutItems = useMemo(
    () => (isBuyNow ? (buyNowItems || []) : cart),
    [isBuyNow, buyNowItems, cart],
  );

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
  });
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [transactionId, setTransactionId] = useState('');
  const [senderAccount, setSenderAccount] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [copiedAccount, setCopiedAccount] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;

    userService.getProfile()
      .then((res) => {
        const profile = res.data?.data || res.data;
        setForm({
          fullName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
          phone: profile.phone || '',
          address: profile.address || '',
          city: profile.city || '',
        });
      })
      .catch(() => {
        if (user) {
          setForm({
            fullName: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
            phone: user.phone || '',
            address: user.address || '',
            city: user.city || '',
          });
        }
      });
  }, [isAuthenticated, user]);

  const subtotal = checkoutItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal > 2000 || subtotal === 0 ? 0 : 250;
  const total = subtotal + shipping;

  const handleCopyAccount = async (value, e) => {
    e?.preventDefault();
    e?.stopPropagation();

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = value;
        textArea.setAttribute('readonly', '');
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      setCopiedAccount(value);
      window.setTimeout(() => setCopiedAccount(''), 2000);
    } catch (err) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = value;
        textArea.setAttribute('readonly', '');
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopiedAccount(value);
        window.setTimeout(() => setCopiedAccount(''), 2000);
      } catch (fallbackErr) {
        setError('Unable to copy account details right now.');
      }
    }
  };

  if (!isAuthenticated) {
    const redirectPath = isBuyNow ? '/checkout?mode=buynow' : '/checkout';
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirectPath)}`} replace />;
  }

  if (checkoutItems.length === 0) {
    return <Navigate to={isBuyNow ? '/products' : '/cart'} replace />;
  }

  const validateField = (name, value) => {
    const nextErrors = { ...errors };

    if (name === 'fullName') {
      if (!value.trim()) {
        nextErrors.fullName = 'Full name is required.';
      } else {
        delete nextErrors.fullName;
      }
    }

    if (name === 'phone') {
      if (!value.trim()) {
        nextErrors.phone = 'Phone number is required.';
      } else if (!/^((\+92|92|0)?3\d{9})$/.test(value.trim())) {
        nextErrors.phone = 'Please enter a valid phone number.';
      } else {
        delete nextErrors.phone;
      }
    }

    if (name === 'address') {
      if (!value.trim()) {
        nextErrors.address = 'Address is required.';
      } else {
        delete nextErrors.address;
      }
    }

    if (name === 'city') {
      if (!value.trim()) {
        nextErrors.city = 'Please select a city.';
      } else {
        delete nextErrors.city;
      }
    }

    return nextErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setErrors((prev) => validateField(name, value));
  };

  const validateForm = () => {
    const nextErrors = {};
    const fullName = form.fullName.trim();
    const phone = form.phone.trim();
    const address = form.address.trim();
    const city = form.city.trim();

    if (!fullName) {
      nextErrors.fullName = 'Full name is required.';
    }

    if (!phone) {
      nextErrors.phone = 'Phone number is required.';
    } else if (!/^((\+92|92|0)?3\d{9})$/.test(phone)) {
      nextErrors.phone = 'Please enter a valid phone number.';
    }

    if (!address) {
      nextErrors.address = 'Address is required.';
    }

    if (!city) {
      nextErrors.city = 'Please select a city.';
    }

    return nextErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validateForm();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setError('Please complete the highlighted fields before placing your order.');
      return;
    }

    setError('');
    setLoading(true);

    const shippingAddress = `${form.fullName.trim()}, ${form.phone.trim()}, ${form.address.trim()}, ${form.city.trim()}`;

    try {
      const payload = {
        shipping_address: shippingAddress,
        shipping_cost: shipping,
        payment_method: paymentMethod,
        items: checkoutItems.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
        })),
        payment_details: {
          transaction_id: transactionId || null,
          sender_account_number: senderAccount || null,
        },
      };

      const response = await orderService.createOrder(payload);
      const createdOrder = response.data?.data;

      if (paymentMethod === 'online' && receiptFile && createdOrder?.id) {
        const formData = new FormData();
        formData.append('receipt', receiptFile);
        formData.append('transaction_id', transactionId || '');
        formData.append('sender_account_number', senderAccount || '');
        await orderService.submitPaymentProof(createdOrder.id, formData);
      }

      if (isBuyNow) {
        clearBuyNowItems();
      } else {
        clearCart();
      }

      navigate('/orders', { state: { orderPlaced: true, paymentMethod } });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-main py-6 animate-fade-in">
      <Breadcrumb items={[
        { label: 'Home', to: '/' },
        ...(isBuyNow
          ? [{ label: 'Product', to: `/products/${checkoutItems[0]?.id}` }]
          : [{ label: 'Cart', to: '/cart' }]),
        { label: isBuyNow ? 'Buy Now Checkout' : 'Checkout' },
      ]} />

      <h1 className="text-xl font-bold text-dark mb-6">
        {isBuyNow ? 'Buy Now Checkout' : 'Checkout'}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-sm shadow-card p-6 space-y-4">
            <h2 className="font-bold text-lg">Shipping Information</h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-sm text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  className={`input-field ${errors.fullName ? 'border-red-300' : ''}`}
                  placeholder="John Doe"
                />
                {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className={`input-field ${errors.phone ? 'border-red-300' : ''}`}
                  placeholder="03XX XXXXXXX"
                />
                {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">Address</label>
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                rows={3}
                className={`input-field resize-none ${errors.address ? 'border-red-300' : ''}`}
                placeholder="House no, street, area"
              />
              {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">City</label>
              <select
                name="city"
                value={form.city}
                onChange={handleChange}
                className={`input-field ${errors.city ? 'border-red-300' : ''}`}
              >
                <option value="">Select a city</option>
                {CITY_OPTIONS.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city}</p>}
            </div>

            <div className="pt-2">
              <h2 className="font-bold text-lg mb-1">Payment</h2>
              <p className="text-xs text-gray-500 mb-3">All transactions are secure and encrypted.</p>

              {paymentMethod === 'online' && (
                <div className="mb-4 rounded-sm border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-semibold">Payment instructions</p>
                  <ol className="mt-2 list-decimal pl-5 space-y-1">
                    <li>Transfer the total amount to any account below.</li>
                    <li>Include your order number in the payment reference.</li>
                    <li>Upload your payment receipt after completing the transfer.</li>
                    <li>We will verify the payment and move the order to processing.</li>
                  </ol>
                </div>
              )}

              <div className="space-y-3">
                <label className={`block p-4 border-2 rounded-sm cursor-pointer ${paymentMethod === 'online' ? 'border-primary bg-primary-50' : 'border-gray-200'}`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="payment"
                      value="online"
                      checked={paymentMethod === 'online'}
                      onChange={() => setPaymentMethod('online')}
                      className="accent-primary mt-1"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{PAYMENT_METHOD_LABELS.online}</p>
                      {paymentMethod === 'online' && (
                        <div className="mt-3 space-y-3 text-sm text-gray-700">
                          <div className="rounded-sm border border-gray-200 bg-white p-3">
                            <p className="font-semibold text-dark">Payment options</p>
                            <div className="mt-3 grid gap-3">
                              {ONLINE_PAYMENT_ACCOUNTS.map((account) => (
                                <div key={`${account.type}-${account.account}`} className="rounded-lg border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-3 shadow-sm">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-2.5">
                                      <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        {getPaymentIcon(account.type)}
                                      </div>
                                      <div>
                                        <p className="font-semibold text-dark">{account.type}</p>
                                        {account.provider && account.type === 'Bank' && <p className="text-sm text-gray-600">{account.provider}</p>}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(e) => handleCopyAccount(account.account, e)}
                                      className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 transition hover:border-primary hover:text-primary"
                                    >
                                      {copiedAccount === account.account ? 'Copied' : 'Copy'}
                                    </button>
                                  </div>
                                  <div className="mt-3 rounded-md bg-white p-3 shadow-inner">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Account</p>
                                    <p className="mt-1 font-mono text-sm font-semibold text-gray-900">{account.account}</p>
                                    <p className="mt-1 text-sm text-gray-700">{account.accountHolder}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="mt-3 space-y-3">
                            <div>
                              <label className="block text-sm font-semibold mb-1.5">Upload Receipt</label>
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => {
                                  setReceiptFile(e.target.files?.[0] || null);
                                  setErrors((prev) => {
                                    const next = { ...prev };
                                    delete next.receiptFile;
                                    return next;
                                  });
                                }}
                                className={`block w-full text-sm text-gray-600 file:mr-3 file:rounded-sm file:border-0 file:bg-primary file:px-3 file:py-2 file:text-white ${errors.receiptFile ? 'border border-red-300 rounded-sm' : ''}`}
                              />
                              {errors.receiptFile && <p className="mt-1 text-xs text-red-600">{errors.receiptFile}</p>}
                            </div>
                            <div>
                              <label className="block text-sm font-semibold mb-1.5">Transaction ID / Reference Number</label>
                              <input
                                type="text"
                                value={transactionId}
                                onChange={(e) => {
                                  setTransactionId(e.target.value);
                                  setErrors((prev) => {
                                    const next = { ...prev };
                                    delete next.transactionId;
                                    return next;
                                  });
                                }}
                                className={`input-field ${errors.transactionId ? 'border-red-300' : ''}`}
                                placeholder="ABC123456"
                              />
                              {errors.transactionId && <p className="mt-1 text-xs text-red-600">{errors.transactionId}</p>}
                            </div>
                            <div>
                              <label className="block text-sm font-semibold mb-1.5">Sender Account Number</label>
                              <input
                                type="text"
                                value={senderAccount}
                                onChange={(e) => {
                                  setSenderAccount(e.target.value);
                                  setErrors((prev) => {
                                    const next = { ...prev };
                                    delete next.senderAccount;
                                    return next;
                                  });
                                }}
                                className={`input-field ${errors.senderAccount ? 'border-red-300' : ''}`}
                                placeholder="0313xxxxxxx"
                              />
                              {errors.senderAccount && <p className="mt-1 text-xs text-red-600">{errors.senderAccount}</p>}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-4 border-2 rounded-sm cursor-pointer ${paymentMethod === 'cod' ? 'border-primary bg-primary-50' : 'border-gray-200'}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="accent-primary"
                  />
                  <div>
                    <p className="font-semibold text-sm">{PAYMENT_METHOD_LABELS.cod}</p>
                    <p className="text-xs text-gray-500">Pay when your order arrives</p>
                  </div>
                </label>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Placing Order...' : `Place Order — ${formatPrice(total)}`}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-sm shadow-card p-6 h-fit sticky top-36">
          <h2 className="font-bold text-lg mb-4">Order Summary</h2>
          <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
            {checkoutItems.map((item) => (
              <div key={item.id} className="flex gap-3">
                <ProductImage product={item} className="w-14 h-14 rounded-sm flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-2">{item.name}</p>
                  <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                  <p className="text-sm font-semibold text-primary">{formatPrice(item.price * item.quantity)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Shipping</span>
              <span>{shipping === 0 ? 'FREE' : formatPrice(shipping)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Payment</span>
              <span>{PAYMENT_METHOD_LABELS[paymentMethod]}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total</span>
              <span className="text-primary">{formatPrice(total)}</span>
            </div>
          </div>
          {!isBuyNow && (
            <Link to="/cart" className="block text-center text-sm text-primary mt-4 hover:underline">
              &larr; Back to Cart
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Checkout;
