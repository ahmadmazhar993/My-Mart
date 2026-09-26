import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { userService } from '../services';
import { useAuthStore } from '../store';
import { useEffect, useState } from 'react';

const iconWrapper = (children) => (
  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50 text-xl text-primary-600">
    {children}
  </span>
);

const Profile = () => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const [addresses, setAddresses] = useState([]);
  const [addressError, setAddressError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;
    userService.getAddresses()
      .then((response) => setAddresses((response.data?.data || [])
        .slice(0, 2)
        .map((address, index) => ({ ...address, label: index === 0 ? 'Home' : 'Office' }))))
      .catch(() => setAddressError('Saved addresses could not be loaded.'));
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleDeleteAddress = async (id) => {
    try {
      await userService.deleteAddress(id);
      setAddresses((current) => current
        .filter((address) => address.id !== id)
        .slice(0, 2)
        .map((address, index) => ({ ...address, label: index === 0 ? 'Home' : 'Office' })));
    } catch {
      setAddressError('Saved address could not be deleted.');
    }
  };

  const menuItems = [
    { icon: '📦', label: 'My Orders', to: '/orders', desc: 'Track, return, or buy again' },
    { icon: '❤️', label: 'Wishlist', to: '/wishlist', desc: 'Your saved items' },
    { icon: '⭐', label: 'Reviews', to: '/reviews', desc: 'Your product reviews' },
    { icon: '⚙️', label: 'Account Settings', to: '/settings', desc: 'Manage your account' },
    ...(user?.role === 'Admin'
      ? [{ icon: '🛡️', label: 'Admin Panel', to: '/admin', desc: 'Manage products, orders & users' }]
      : []),
  ];

  return (
    <div className="container-main animate-fade-in py-6">
      {/* Profile header card */}
      <div className="mb-6 rounded-xl border border-gray-100 bg-white p-6 shadow-card">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-primary-200 text-2xl font-bold text-primary-700 ring-2 ring-primary-100">
            {(user?.firstName || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-dark">
              {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'AHM Mart User'}
            </h1>
            <p className="text-sm text-gray-500">{user?.email || ''}</p>
            {user?.role && (
              <span className="mt-1.5 inline-flex items-center rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold capitalize text-primary-700 ring-1 ring-inset ring-primary-200">
                {user.role}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Menu grid */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {menuItems.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            {iconWrapper(item.icon)}
            <div>
              <h3 className="font-semibold text-dark">{item.label}</h3>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Saved addresses */}
      <section className="mb-6 rounded-xl border border-gray-100 bg-white p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-dark">Saved Addresses</h2>
            <p className="mt-1 text-xs text-gray-500">Use these addresses during checkout.</p>
          </div>
          <Link
            to="/checkout"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition hover:underline"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add address
          </Link>
        </div>

        {addressError && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {addressError}
          </div>
        )}

        {addresses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 py-8 text-center">
            <p className="text-sm text-gray-500">No saved addresses yet.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {addresses.map((address) => (
              <div
                key={address.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 p-3.5 transition hover:border-gray-300"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                      {address.label}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-600">{address.full_name} · {address.phone}</p>
                  <p className="text-xs text-gray-500">{address.address}, {address.city}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteAddress(address.id)}
                  className="flex-shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={logout}
        className="w-full rounded-lg border border-red-200 bg-red-50 px-8 py-2.5 text-sm font-semibold text-red-600 shadow-sm transition hover:border-red-300 hover:bg-red-100 sm:w-auto"
      >
        Logout
      </button>
    </div>
  );
};

export default Profile;