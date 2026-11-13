import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ChevronRight, Heart, LogOut, MapPin, Package, Plus, Settings, ShieldCheck, Star, Trash2 } from 'lucide-react';
import { userService } from '../services';
import { useAuthStore } from '../store';
import usePageMeta from '../hooks/usePageMeta';

const Profile = () => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const [addresses, setAddresses] = useState([]);
  const [addressError, setAddressError] = useState('');

  usePageMeta({ title: 'My Account', description: 'Manage your AHM Mart account.', path: '/profile', noindex: true });

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
    { Icon: Package, label: 'My Orders', to: '/orders', desc: 'Track, return, or buy again' },
    { Icon: Heart, label: 'Wishlist', to: '/wishlist', desc: 'Your saved items' },
    { Icon: Star, label: 'Reviews', to: '/reviews', desc: 'Your product reviews' },
    { Icon: Settings, label: 'Account Settings', to: '/settings', desc: 'Manage your account' },
    ...(user?.role === 'Admin'
      ? [{ Icon: ShieldCheck, label: 'Admin Panel', to: '/admin', desc: 'Manage products, orders & users' }]
      : []),
  ];

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'AHM Mart User';

  return (
    <div className="container-main animate-fade-in py-4 sm:py-6">
      {/* Profile header */}
      <div className="relative mb-4 overflow-hidden rounded-2xl bg-gradient-to-r from-primary-800 via-primary-700 to-primary-600 p-4 text-white shadow-soft sm:mb-6 sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-white/10" aria-hidden="true" />
        <div className="relative flex items-center gap-3 sm:gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-white text-2xl font-extrabold text-primary-700 shadow-md sm:h-16 sm:w-16" aria-hidden="true">
            {(user?.firstName || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-xl font-extrabold tracking-tight sm:text-2xl">{displayName}</h1>
            <p className="break-all text-sm text-primary-100">{user?.email || ''}</p>
            {user?.role && (
              <span className="mt-1.5 inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold capitalize text-white ring-1 ring-white/30">
                {user.role}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav aria-label="Account" className="mb-6">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {menuItems.map(({ Icon, label, to, desc }) => (
            <li key={label}>
              <Link
                to={to}
                className="group flex min-h-[72px] items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-soft sm:gap-4"
              >
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 text-primary-700 transition-colors group-hover:from-primary-600 group-hover:to-primary-700 group-hover:text-white">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-dark">{label}</span>
                  <span className="block text-xs text-gray-500">{desc}</span>
                </span>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Saved addresses */}
      <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-card sm:p-5" aria-labelledby="saved-addresses">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 id="saved-addresses" className="font-bold text-dark">Saved addresses</h2>
            <p className="mt-0.5 text-xs text-gray-500">Use these addresses during checkout.</p>
          </div>
          <Link
            to="/checkout"
            className="inline-flex min-h-[44px] items-center gap-1 whitespace-nowrap text-sm font-semibold text-primary-700 transition hover:underline"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add address
          </Link>
        </div>

        {addressError && (
          <div role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {addressError}
          </div>
        )}

        {addresses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center">
            <MapPin className="mx-auto h-6 w-6 text-gray-300" aria-hidden="true" />
            <p className="mt-2 text-sm text-gray-500">No saved addresses yet.</p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {addresses.map((address) => (
              <li
                key={address.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 p-3.5 transition hover:border-primary-200"
              >
                <div className="min-w-0 break-words">
                  <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700">
                    {address.label}
                  </span>
                  <p className="mt-1.5 text-sm text-gray-700">{address.full_name} · {address.phone}</p>
                  <p className="text-sm text-gray-500">{address.address}, {address.city}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteAddress(address.id)}
                  aria-label={`Delete ${address.label} address`}
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button
        type="button"
        onClick={logout}
        className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-8 text-sm font-semibold text-red-600 shadow-sm transition hover:border-red-300 hover:bg-red-100 sm:w-auto"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Logout
      </button>
    </div>
  );
};

export default Profile;
