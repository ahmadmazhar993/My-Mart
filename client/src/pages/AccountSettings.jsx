import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Breadcrumb } from '../components/ui';
import { userService } from '../services';
import { useAuthStore } from '../store';

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
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setError('');
    setMessage('');

    try {
      const response = await userService.updateProfile(form);
      const updatedUser = response.data?.data;
      if (updatedUser) {
        setUser({ ...user, ...updatedUser });
      } else {
        setUser({ ...user, ...form });
      }
      setMessage('Account updated successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update account. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Password change removed: password management should be via Forgot Password flow

  return (
    <div className="container-main py-6 animate-fade-in">
      <Breadcrumb items={[
        { label: 'Home', to: '/' },
        { label: 'Profile', to: '/profile' },
        { label: 'Account Settings' },
      ]} />

      <div className="max-w-xl mx-auto">
        <div className="bg-white rounded-sm shadow-card p-6">
          <h1 className="text-xl font-bold text-dark mb-1">Account Settings</h1>
          <p className="text-sm text-gray-500 mb-6">Update your personal information</p>

          {loadingProfile ? (
            <p className="text-sm text-gray-500">Loading profile...</p>
          ) : (
            <>
              {message && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-sm mb-4 text-sm">
                  {message}
                </div>
              )}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-sm mb-4 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">First Name</label>
                    <input name="first_name" value={form.first_name} onChange={handleChange} required className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Last Name</label>
                    <input name="last_name" value={form.last_name} onChange={handleChange} required className="input-field" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5">Email</label>
                  <input value={user?.email || ''} disabled className="input-field bg-gray-50 text-gray-500" />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5">Phone</label>
                  <input name="phone" value={form.phone} onChange={handleChange} className="input-field" placeholder="03XX XXXXXXX" />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5">Address</label>
                  <textarea name="address" value={form.address} onChange={handleChange} rows={2} className="input-field" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">City</label>
                    <input name="city" value={form.city} onChange={handleChange} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Postal Code</label>
                    <input name="postal_code" value={form.postal_code} onChange={handleChange} className="input-field" />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={savingProfile} className="btn-primary">
                    {savingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                  <Link to="/profile" className="btn-secondary">Cancel</Link>
                </div>
              </form>

              {/* Password change removed - use Forgot Password flow instead */}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
