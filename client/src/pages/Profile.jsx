import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store';

const Profile = () => {
  const { isAuthenticated, user, logout } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

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
    <div className="container-main py-6 animate-fade-in">
      <div className="bg-white rounded-sm shadow-card p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-2xl font-bold text-primary">
            {(user?.first_name || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-dark">
              {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'AHM Mart User'}
            </h1>
            <p className="text-sm text-gray-500">{user?.email || ''}</p>
            {user?.role && (
              <span className="inline-block mt-1 text-xs font-semibold capitalize bg-primary-50 text-primary px-2 py-0.5 rounded-sm">
                {user.role}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {menuItems.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className="bg-white rounded-sm shadow-card p-5 flex items-center gap-4 hover:shadow-card-hover transition-shadow"
          >
            <span className="text-2xl">{item.icon}</span>
            <div>
              <h3 className="font-semibold text-dark">{item.label}</h3>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <button
        type="button"
        onClick={logout}
        className="w-full sm:w-auto px-8 py-2.5 border border-red-300 text-red-600 font-semibold rounded-sm hover:bg-red-50 transition-colors"
      >
        Logout
      </button>
    </div>
  );
};

export default Profile;
