import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import ProductImage from '../components/ProductImage';
import { Breadcrumb } from '../components/ui';
import { useToast } from '../components/ToastProvider';
import { ONLINE_PAYMENT_ACCOUNTS, PAYMENT_METHOD_LABELS } from '../config/paymentAccounts';
import { getShippingInfo } from '../config/shipping';
import { orderService, userService } from '../services';
import { useAuthStore, useCartStore } from '../store';
import { formatPrice } from '../utils/format';
import { buildProductPath } from '../utils/product';
import { validatePaymentReceiptFile, validateSenderAccount } from '../utils/paymentValidation';

const CITY_OPTIONS = [
  // 'Karachi',
  'Lahore',
  // 'Islamabad',
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

// Small reusable icons for form fields
const FieldIcon = ({ name }) => {
  const common = 'h-4 w-4 text-gray-400';
  switch (name) {
    case 'user':
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5 20c1.2-3.6 4-5.4 7-5.4s5.8 1.8 7 5.4" strokeLinecap="round" />
        </svg>
      );
    case 'phone':
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 3h3l1.5 4.5L8.5 9c.8 2.2 2.3 3.7 4.5 4.5l1.5-2L18.5 13v3a2 2 0 01-2.2 2C10.6 17.6 6.4 13.4 6 7.7A2 2 0 016 3z" strokeLinejoin="round" />
        </svg>
      );
    case 'pin':
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 21s-6.5-5.6-6.5-11A6.5 6.5 0 1118.5 10c0 5.4-6.5 11-6.5 11z" />
          <circle cx="12" cy="10" r="2.2" />
        </svg>
      );
    case 'city':
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 21V9l5-3v15M14 21V4l6 3v14" strokeLinejoin="round" />
          <path d="M4 21h16" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
};

const StepBadge = ({ n }) => (
  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
    {n}
  </span>
);

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();
  const { cart, clearCart, buyNowItems, clearBuyNowItems, updateQuantity, removeItem } = useCartStore();
  const { addToast } = useToast();

  const isBuyNow = new URLSearchParams(location.search).get('mode') === 'buynow';
  const checkoutItems = useMemo(
    () => (isBuyNow ? (buyNowItems || []) : cart),
    [isBuyNow, buyNowItems, cart],
  );

  const canEditQuantity = !isBuyNow && typeof updateQuantity === 'function';

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
  const shippingInfo = getShippingInfo(subtotal);
  const shipping = shippingInfo.cost;
  const total = subtotal + shipping;
  const totalItemCount = checkoutItems.reduce((n, item) => n + item.quantity, 0);

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

  const handleQuantityChange = (item, delta) => {
    if (!canEditQuantity) return;

    if (delta > 0) {
      const availableStock = Number(item.stock_quantity ?? item.stock ?? 0);
      if (availableStock > 0 && item.quantity >= availableStock) {
        addToast(`You already have the maximum available quantity (${availableStock}) in your cart.`, 'error');
        return;
      }
    }

    const nextQty = Math.max(1, (item.quantity || 1) + delta);
    if (nextQty === item.quantity) return;
    updateQuantity(item, nextQty);
  };

  // ADD THIS — right after handleQuantityChange
  const handleRemoveItem = (item) => {
    if (isBuyNow) {
      clearBuyNowItems();
      navigate(buildProductPath({ id: item.id, name: item.name }));
      return;
    }
    removeItem(item);
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
      const digitsOnly = (value || '').toString().replace(/\D/g, '');
      if (!digitsOnly) {
        nextErrors.phone = 'Phone number is required.';
      } else if (!/^\d{11}$/.test(digitsOnly)) {
        nextErrors.phone = 'Phone number must be exactly 11 digits.';
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
    const phone = (form.phone || '').toString();
    const address = form.address.trim();
    const city = form.city.trim();

    if (!fullName) {
      nextErrors.fullName = 'Full name is required.';
    }

    const phoneDigits = phone.replace(/\D/g, '');
    if (!phoneDigits) {
      nextErrors.phone = 'Phone number is required.';
    } else if (!/^\d{11}$/.test(phoneDigits)) {
      nextErrors.phone = 'Phone number must be exactly 11 digits.';
    }

    if (!address) {
      nextErrors.address = 'Address is required.';
    }

    if (!city) {
      nextErrors.city = 'Please select a city.';
    }

    return nextErrors;
  };

  const validateOnlinePaymentDetails = () => {
    const nextErrors = {};

    const receiptError = validatePaymentReceiptFile(receiptFile);
    if (receiptError) {
      nextErrors.receiptFile = receiptError;
    }
    const senderError = validateSenderAccount(senderAccount);
    if (senderError) {
      nextErrors.senderAccount = senderError;
    }

    return nextErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const shippingErrors = validateForm();
    const paymentErrors = paymentMethod === 'online' ? validateOnlinePaymentDetails() : {};
    const nextErrors = { ...shippingErrors, ...paymentErrors };
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      const message = 'Please complete the highlighted fields before placing your order.';
      setError(message);
      addToast(message, 'error');
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
          variant_name: item.variant_name || null,
          variant_label: item.variant_label || null,
          variant_sku: item.variant_sku || null,
        })),
        payment_details: {
            sender_account_number: senderAccount || null,
        },
      };

      const response = await orderService.createOrder(payload);
      const createdOrder = response.data?.data;

      if (paymentMethod === 'online' && receiptFile && createdOrder?.id) {
        const formData = new FormData();
        formData.append('receipt', receiptFile);
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
          ? [{ label: 'Product', to: buildProductPath({ id: checkoutItems[0]?.id, name: checkoutItems[0]?.name }) }]
          : [{ label: 'Cart', to: '/cart' }]),
        { label: isBuyNow ? 'Buy Now Checkout' : 'Checkout' },
      ]} />

      <div className="flex items-center gap-2 mb-1 mt-4">
        <h1 className="text-xl sm:text-2xl font-bold text-dark">
          {isBuyNow ? 'Buy Now Checkout' : 'Checkout'}
        </h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">Secure checkout &middot; {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} in your order</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mt-0.5 flex-shrink-0">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 6a1 1 0 112 0v4a1 1 0 11-2 0V6zm1 8a1.25 1.25 0 100-2.5A1.25 1.25 0 0010 14z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Shipping Information card */}
            <div className="bg-white rounded-xl shadow-card p-5 sm:p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <StepBadge n={1} />
                <h2 className="font-bold text-base sm:text-lg text-dark">Shipping Information</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <FieldIcon name="user" />
                    </span>
                    <input
                      type="text"
                      name="fullName"
                      value={form.fullName}
                      onChange={handleChange}
                      className={`input-field pl-9 ${errors.fullName ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
                      placeholder="Ahm Mart"
                    />
                  </div>
                  {errors.fullName && <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">{errors.fullName}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <FieldIcon name="phone" />
                    </span>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      inputMode="numeric"
                      pattern="[0-9]{11}"
                      onChange={(e) => {
                        const raw = e.target.value || '';
                        const digits = raw.replace(/\D/g, '');
                        setForm((prev) => ({ ...prev, phone: digits }));
                        setErrors(() => validateField('phone', digits));
                      }}
                      className={`input-field pl-9 ${errors.phone ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
                      placeholder="03XXXXXXXXX"
                    />
                  </div>
                  {errors.phone && <p className="mt-1.5 text-xs text-red-600">{errors.phone}</p>}
                </div>
              </div>

              <div className="mt-4">
                
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                  Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 pointer-events-none">
                    <FieldIcon name="pin" />
                  </span>
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    rows={3}
                    className={`input-field pl-9 resize-none ${errors.address ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
                    placeholder="House no, street, area"
                  />
                </div>
                {errors.address && <p className="mt-1.5 text-xs text-red-600">{errors.address}</p>}
              </div>

              <div className="mt-4">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                  City <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <FieldIcon name="city" />
                  </span>
                  <select
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    className={`input-field pl-9 appearance-none ${errors.city ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
                  >
                    <option value="">Select a city</option>
                    {CITY_OPTIONS.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </div>
                {errors.city && <p className="mt-1.5 text-xs text-red-600">{errors.city}</p>}
              </div>
            </div>

            {/* Payment card */}
            <div className="bg-white rounded-xl shadow-card p-5 sm:p-6">
              <div className="flex items-center gap-2.5 mb-1">
                <StepBadge n={2} />
                <h2 className="font-bold text-base sm:text-lg text-dark">Payment Method</h2>
              </div>
              <p className="text-xs text-gray-500 mb-5 ml-8">All transactions are secure and encrypted.</p>

              <div className="space-y-3">
                {/* Online payment option */}
                <label
                  className={`block p-4 border-2 rounded-xl cursor-pointer transition ${paymentMethod === 'online' ? 'border-primary bg-primary-50/40' : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${paymentMethod === 'online' ? 'border-primary' : 'border-gray-300'
                        }`}
                    >
                      {paymentMethod === 'online' && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                    </span>
                    <input
                      type="radio"
                      name="payment"
                      value="online"
                      checked={paymentMethod === 'online'}
                      onChange={() => setPaymentMethod('online')}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-dark">{PAYMENT_METHOD_LABELS.online}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Bank transfer, Easypaisa &amp; more</p>

                      {paymentMethod === 'online' && (
                        <div className="mt-4 space-y-5 text-sm text-gray-700">

                          {/* Step 1: pick an account to pay into */}
                          <div>
                            <p className="font-semibold text-dark text-sm mb-2.5">1. Send payment to</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {ONLINE_PAYMENT_ACCOUNTS.map((account) => {
                                const isSelected = senderAccount === account.account || copiedAccount === account.account;
                                return (
                                  <button
                                    key={`${account.type}-${account.account}`}
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleCopyAccount(account.account, e);
                                    }}
                                    className={`text-left rounded-lg border p-3 transition relative ${copiedAccount === account.account
                                      ? 'border-primary bg-primary-50/60'
                                      : 'border-gray-200 bg-white hover:border-gray-300'
                                      }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600">
                                        {getPaymentIcon(account.type)}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-semibold text-dark text-sm truncate">{account.type}</p>
                                        {account.provider && account.type === 'Bank' && (
                                          <p className="text-[11px] text-gray-500 truncate">{account.provider}</p>
                                        )}
                                      </div>
                                    </div>
                                    <p className="mt-2 font-mono text-sm font-semibold text-gray-900">{account.account}</p>
                                    <p className="text-[11px] text-gray-500">{account.accountHolder}</p>

                                    <span
                                      className={`absolute top-2.5 right-2.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${copiedAccount === account.account
                                        ? 'bg-primary text-white'
                                        : 'bg-gray-100 text-gray-500'
                                        }`}
                                    >
                                      {copiedAccount === account.account ? 'Copied ✓' : 'Tap to copy'}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Step 2: instructions, compact */}
                          <div className="flex gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0 mt-0.5">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 6a1 1 0 112 0v4a1 1 0 11-2 0V6zm1 8a1.25 1.25 0 100-2.5A1.25 1.25 0 0010 14z" clipRule="evenodd" />
                            </svg>
                            <p>Transfer the total amount, then fill in the details below. We'll verify and move your order to processing.</p>
                          </div>

                          {/* Step 3: proof of payment */}
                          <div>
                            <p className="font-semibold text-dark text-sm mb-2.5">2. Confirm your payment</p>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                                  Payment Receipt <span className="text-red-500">*</span>
                                </label>
                                <label
                                  className={`flex items-center gap-3 rounded-lg border-2 border-dashed p-3.5 cursor-pointer transition ${errors.receiptFile
                                    ? 'border-red-300 bg-red-50/40'
                                    : receiptFile
                                      ? 'border-primary bg-primary-50/40'
                                      : 'border-gray-300 hover:border-gray-400 bg-gray-50/50'
                                    }`}
                                >
                                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${receiptFile ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
                                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                                      <path d="M12 16V4m0 0L7 9m5-5l5 5" strokeLinecap="round" strokeLinejoin="round" />
                                      <path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-dark truncate">
                                      {receiptFile ? receiptFile.name : 'Upload screenshot or PDF'}
                                    </p>
                                    <p className="text-xs text-gray-500">PNG, JPG, or PDF up to 5MB</p>
                                  </div>
                                  <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    className="sr-only"
                                    required={paymentMethod === 'online'}
                                    aria-required={paymentMethod === 'online'}
                                    aria-invalid={!!errors.receiptFile}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0] || null;
                                      setReceiptFile(file);
                                      setErrors((prev) => {
                                        const next = { ...prev };
                                        const receiptError = validatePaymentReceiptFile(file);
                                        if (receiptError) {
                                          next.receiptFile = receiptError;
                                        } else {
                                          delete next.receiptFile;
                                        }
                                        return next;
                                      });
                                    }}
                                  />
                                </label>
                                {errors.receiptFile && <p className="mt-1 text-xs text-red-600">{errors.receiptFile}</p>}
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                                  Sender Account <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  name="senderAccount"
                                  value={senderAccount}
                                  required={paymentMethod === 'online'}
                                  aria-required={paymentMethod === 'online'}
                                    aria-invalid={!!errors.senderAccount}
                                    inputMode="numeric"
                                    pattern="[0-9]{11}|[0-9]{14}"
                                    onChange={(e) => {
                                      const raw = e.target.value || '';
                                      const digits = raw.replace(/\D/g, '');
                                      setSenderAccount(digits);
                                      setErrors((prev) => {
                                        const next = { ...prev };
                                        const senderError = validateSenderAccount(digits);
                                        if (senderError) {
                                          next.senderAccount = senderError;
                                        } else {
                                          delete next.senderAccount;
                                        }
                                        return next;
                                      });
                                    }}
                                    className={`input-field ${errors.senderAccount ? 'border-red-300' : ''}`}
                                    placeholder="03XXXXXXXXX or 11XXXXXXXXXXXX"
                                />
                                {errors.senderAccount && <p className="mt-1 text-xs text-red-600">{errors.senderAccount}</p>}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </label>

                {/* Cash on Delivery option */}
                <label
                  className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition ${paymentMethod === 'cod' ? 'border-primary bg-primary-50/40' : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <span
                    className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${paymentMethod === 'cod' ? 'border-primary' : 'border-gray-300'
                      }`}
                  >
                    {paymentMethod === 'cod' && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                  </span>
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="sr-only"
                  />
                  <div>
                    <p className="font-semibold text-sm text-dark">{PAYMENT_METHOD_LABELS.cod}</p>
                    <p className="text-xs text-gray-500">Pay when your order arrives</p>
                  </div>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 text-sm sm:text-base font-semibold rounded-xl shadow-sm disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Placing Order...
                </span>
              ) : (
                `Place Order — ${formatPrice(total)}`
              )}
            </button>
            <p className="text-center text-xs text-gray-400 -mt-2">
              By placing your order, you agree to our terms of service.
            </p>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-card p-5 sm:p-6 h-fit sticky top-36">
          <h2 className="font-bold text-lg mb-4">Order Summary</h2>

          {/* Shipping tier nudge */}
          {shippingInfo.nextTier ? (
            <div className="mb-4 rounded-lg border border-primary/20 bg-primary-50/50 p-3">
              <p className="text-xs text-gray-600 mb-2">
                {shippingInfo.nextTier.cost === 0 ? (
                  <>Add <span className="font-semibold text-primary">{formatPrice(shippingInfo.amountToNextTier)}</span> more for <span className="font-semibold text-green-600">FREE delivery</span></>
                ) : (
                  <>Add <span className="font-semibold text-primary">{formatPrice(shippingInfo.amountToNextTier)}</span> more to cut delivery to <span className="font-semibold text-primary">{formatPrice(shippingInfo.nextTier.cost)}</span></>
                )}
              </p>
              <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-green-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (subtotal / shippingInfo.nextTier.minSubtotal) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 flex items-center gap-1.5">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              You've unlocked FREE delivery!
            </div>
          )}

          {/* Line items */}
          <div className="space-y-3 mb-4 max-h-80 overflow-y-auto pr-1">
            {checkoutItems.map((item) => (
              <div key={`${item.id}-${item.variant_sku || ''}`} className="flex gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                <div className="w-16 h-16 flex-shrink-0 rounded-md border border-gray-100 overflow-hidden">
                  <ProductImage product={item} className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <p className="text-sm font-medium text-dark line-clamp-2">{item.name}</p>
                    {item.variant_label && (
                      <p className="text-xs text-gray-500 mt-0.5">{item.variant_label}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      {canEditQuantity ? (
                        <div className="flex items-center border border-gray-200 rounded-full">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item, -1)}
                            disabled={item.quantity <= 1}
                            className="w-6 h-6 flex items-center justify-center text-gray-500 disabled:opacity-30"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="text-xs font-semibold w-6 text-center">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item, 1)}
                            className="w-6 h-6 flex items-center justify-center text-gray-500"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">Qty: {item.quantity}</span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item)}
                        className="text-[11px] font-medium text-red-500 hover:text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold text-dark">{formatPrice(item.price * item.quantity)}</p>
                      {item.quantity > 1 && (
                        <p className="text-[11px] text-gray-400">{formatPrice(item.price)} each</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal ({totalItemCount} {totalItemCount === 1 ? 'item' : 'items'})</span>
              <span className="font-medium">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Delivery</span>
              <span className={shipping === 0 ? 'text-green-600 font-medium' : 'font-medium text-amber-600'}>
                {shipping === 0 ? 'FREE' : formatPrice(shipping)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Payment method</span>
              <span className="font-medium">{PAYMENT_METHOD_LABELS[paymentMethod]}</span>
            </div>
            <div className="flex justify-between items-baseline font-bold text-lg pt-3 mt-1 border-t">
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