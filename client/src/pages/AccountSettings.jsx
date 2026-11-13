import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Breadcrumb } from '../components/ui';
import { userService } from '../services';
import { useAuthStore } from '../store';
import BrandLoader from '../components/BrandLoader';
import AuthField from '../components/auth/AuthField';
import usePageMeta from '../hooks/usePageMeta';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const CITY_OPTIONS = [
  // 'Karachi',
  'Lahore',
  // 'Islamabad',
];

const AccountSettings = () => {
  const { isAuthenticated, user, setUser } = useAuthStore();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  usePageMeta({ title: 'Account Settings', description: 'Update your AHM Mart account details.', path: '/settings', noindex: true });

  useEffect(() => {
    if (!isAuthenticated) return;

    userService.getProfile()
      .then((res) => {
        const profile = res.data?.data || res.data;
        setForm({
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          phone: profile.phone || '',
          address: profile.address || '',
          city: profile.city || '',
          postal_code: profile.postal_code || '',
        });
      })
      .catch(() => {
        setError('Failed to load profile data.');
      })
      .finally(() => setLoadingProfile(false));
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/login?redirect=/settings" replace />;
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!form.first_name.trim()) {
      nextErrors.first_name = 'First name is required.';
    }
    if (!form.last_name.trim()) {
      nextErrors.last_name = 'Last name is required.';
    }
    if (!form.phone.trim()) {
      nextErrors.phone = 'Phone number is required.';
    } else if (!/^\d{10,15}$/.test(form.phone.replace(/\D/g, ''))) {
      nextErrors.phone = 'Enter a valid phone number.';
    }
    if (!form.address.trim()) {
      nextErrors.address = 'Address is required.';
    }
    if (!form.city.trim()) {
      nextErrors.city = 'Please select a city.';
    }
    if (!form.postal_code.trim()) {
      nextErrors.postal_code = 'Postal code is required.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const normalizeUpdatedUser = (updatedUser) => {
    if (!updatedUser) return null;
    return {
      ...updatedUser,
      firstName: updatedUser.first_name || updatedUser.firstName,
      lastName: updatedUser.last_name || updatedUser.lastName,
      phone: updatedUser.phone || updatedUser.phoneNumber,
      address: updatedUser.address,
      city: updatedUser.city,
      postal_code: updatedUser.postal_code || updatedUser.postalCode,
      postalCode: updatedUser.postal_code || updatedUser.postalCode,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!validateForm()) {
      return;
    }

    setSavingProfile(true);

    try {
      const response = await userService.updateProfile(form);
      const updatedUser = response.data?.data;
      const normalizedUser = normalizeUpdatedUser(updatedUser);

      if (normalizedUser) {
        setUser({ ...user, ...normalizedUser, ...form });
      } else {
        setUser({ ...user, ...form });
      }
      setMessage('Account updated successfully.');
      setTimeout(() => {
        navigate('/profile');
      }, 500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update account. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Password change removed: password management should be via Forgot Password flow

  return (
    <div className="container-main animate-fade-in py-6">
      <Breadcrumb items={[
        { label: 'Home', to: '/' },
        { label: 'Profile', to: '/profile' },
        { label: 'Account Settings' },
      ]} />

      <div className="mx-auto max-w-xl">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card sm:p-6">
          <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-dark">Account settings</h1>
          <p className="mb-6 text-sm text-gray-500">Update your personal information</p>

          {loadingProfile ? (
            <BrandLoader minHeight={200} text="Loading profile" />
          ) : (
            <>
              {message && (
                <div role="status" className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  {message}
                </div>
              )}
              {error && (
                <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
                  <AuthField id="set-first-name" label="First name" name="first_name" autoComplete="given-name" value={form.first_name} onChange={handleChange} error={errors.first_name} />
                  <AuthField id="set-last-name" label="Last name" name="last_name" autoComplete="family-name" value={form.last_name} onChange={handleChange} error={errors.last_name} />
                </div>

                <AuthField id="set-email" label="Email" type="email" value={user?.email || ''} disabled readOnly className="[&_input]:bg-gray-50 [&_input]:text-gray-500" hint="Your email can't be changed here." />

                <AuthField id="set-phone" label="Phone" type="tel" name="phone" autoComplete="tel" inputMode="tel" value={form.phone} onChange={handleChange} error={errors.phone} placeholder="03XX XXXXXXX" />

                <div>
                  <label htmlFor="set-address" className="mb-1.5 block text-sm font-semibold text-gray-700">Address</label>
                  <textarea
                    id="set-address"
                    name="address"
                    autoComplete="street-address"
                    value={form.address}
                    onChange={handleChange}
                    rows={3}
                    aria-invalid={errors.address ? 'true' : undefined}
                    aria-describedby={errors.address ? 'set-address-error' : undefined}
                    className={`w-full rounded-xl border bg-white px-3.5 py-3 text-base shadow-sm transition focus:outline-none focus:ring-2 sm:text-sm ${errors.address ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-gray-200 focus:border-primary-500 focus:ring-primary-100'}`}
                  />
                  {errors.address && <p id="set-address-error" role="alert" className="mt-1.5 text-xs text-red-600">{errors.address}</p>}
                </div>

                <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
                  <div>
                    <label htmlFor="set-city" className="mb-1.5 block text-sm font-semibold text-gray-700">City</label>
                    <select
                      id="set-city"
                      name="city"
                      autoComplete="address-level2"
                      value={form.city}
                      onChange={handleChange}
                      aria-invalid={errors.city ? 'true' : undefined}
                      aria-describedby={errors.city ? 'set-city-error' : undefined}
                      className={`h-12 w-full rounded-xl border bg-white px-3.5 text-base shadow-sm transition focus:outline-none focus:ring-2 sm:text-sm ${errors.city ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-gray-200 focus:border-primary-500 focus:ring-primary-100'}`}
                    >
                      <option value="">Select a city</option>
                      {CITY_OPTIONS.map((city) => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                    {errors.city && <p id="set-city-error" role="alert" className="mt-1.5 text-xs text-red-600">{errors.city}</p>}
                  </div>
                  <AuthField id="set-postal" label="Postal code" name="postal_code" autoComplete="postal-code" inputMode="numeric" value={form.postal_code} onChange={handleChange} error={errors.postal_code} />
                </div>

                <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
                  <Link to="/profile" className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-gray-200 bg-white px-6 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">Cancel</Link>
                  <button type="submit" disabled={savingProfile} className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 text-base font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70 sm:flex-none">
                    {savingProfile && <BrandLoader variant="button" />}
                    {savingProfile ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
