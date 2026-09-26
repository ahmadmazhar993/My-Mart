import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services';
import { API_BASE, API_VERSION } from '../services/api';
import { useAuthStore } from '../store';

const UserFieldIcon = () => (
  <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const EmailIcon = () => (
  <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const LockIcon = () => (
  <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const GoogleLogo = () => (
  <svg className="h-5 w-5" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
  </svg>
);

const inputClasses = (hasError) => `w-full rounded-lg border bg-white py-2.5 pl-10 pr-3.5 text-sm shadow-sm transition focus:outline-none focus:ring-2 ${
  hasError
    ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
    : 'border-gray-200 focus:border-primary focus:ring-primary-100'
}`;

const Register = () => {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const validateField = (name, value) => {
    const nextErrors = { ...errors };
    const trimmedValue = value.trim();

    if (name === 'first_name') {
      if (!trimmedValue) {
        nextErrors.first_name = 'First name is required.';
      } else {
        delete nextErrors.first_name;
      }
    }

    if (name === 'last_name') {
      if (!trimmedValue) {
        nextErrors.last_name = 'Last name is required.';
      } else {
        delete nextErrors.last_name;
      }
    }

    if (name === 'email') {
      if (!trimmedValue) {
        nextErrors.email = 'Email is required.';
      } else if (!/^\S+@\S+\.\S+$/.test(trimmedValue)) {
        nextErrors.email = 'Please enter a valid email address.';
      } else {
        delete nextErrors.email;
      }
    }

    if (name === 'password') {
      if (!value) {
        nextErrors.password = 'Password is required.';
      } else if (value.length < 6) {
        nextErrors.password = 'Password must be at least 6 characters.';
      } else {
        delete nextErrors.password;
      }
    }

    if (name === 'confirmPassword') {
      if (!value) {
        nextErrors.confirmPassword = 'Please confirm your password.';
      } else if (form.password !== value) {
        nextErrors.confirmPassword = 'Passwords do not match.';
      } else {
        delete nextErrors.confirmPassword;
      }
    }

    return nextErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextForm = { ...form, [name]: value };
    setForm(nextForm);
    setErrors((prev) => validateField(name, value));
  };

  const validateForm = () => {
    const nextErrors = {};
    const firstName = form.first_name.trim();
    const lastName = form.last_name.trim();
    const email = form.email.trim();
    const password = form.password;
    const confirmPassword = form.confirmPassword;

    if (!firstName) {
      nextErrors.first_name = 'First name is required.';
    }

    if (!lastName) {
      nextErrors.last_name = 'Last name is required.';
    }

    if (!email) {
      nextErrors.email = 'Email is required.';
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      nextErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    return nextErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validateForm();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setError('Please fix the highlighted fields.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const response = await authService.register({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        password: form.password,
        confirm_password: form.confirmPassword,
      });

      const data = response.data?.data || response.data;
      setError('');
      setErrors({});
      navigate('/login', { state: { message: 'Registration successful. Please check your email to verify your account.' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-main animate-fade-in py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-2xl font-extrabold tracking-tight text-dark">Create Account</h1>
          <p className="text-sm text-gray-500">Join AHM Mart for the best shopping experience</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card sm:p-8">
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">First Name</label>
                <div className="relative">
                  <UserFieldIcon />
                  <input
                    type="text"
                    name="first_name"
                    value={form.first_name}
                    onChange={handleChange}
                    className={inputClasses(errors.first_name)}
                    placeholder="First name"
                  />
                </div>
                {errors.first_name && <p className="mt-1.5 text-xs text-red-600">{errors.first_name}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Last Name</label>
                <div className="relative">
                  <UserFieldIcon />
                  <input
                    type="text"
                    name="last_name"
                    value={form.last_name}
                    onChange={handleChange}
                    className={inputClasses(errors.last_name)}
                    placeholder="Last name"
                  />
                </div>
                {errors.last_name && <p className="mt-1.5 text-xs text-red-600">{errors.last_name}</p>}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Email</label>
              <div className="relative">
                <EmailIcon />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className={inputClasses(errors.email)}
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Password</label>
              <div className="relative">
                <LockIcon />
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className={inputClasses(errors.password)}
                  placeholder="Create a password"
                />
              </div>
              {errors.password && <p className="mt-1.5 text-xs text-red-600">{errors.password}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Confirm Password</label>
              <div className="relative">
                <LockIcon />
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className={inputClasses(errors.confirmPassword)}
                  placeholder="Confirm your password"
                />
              </div>
              {errors.confirmPassword && <p className="mt-1.5 text-xs text-red-600">{errors.confirmPassword}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600 active:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>

            <div className="my-5 flex items-center gap-3">
              <div className="flex-1 border-t border-gray-200" />
              <span className="text-xs font-medium text-gray-400">OR</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            <button
              type="button"
              onClick={() => {
                const target = `${window.location.origin}/login`;
                window.location.href =
                  `${API_BASE}${API_VERSION}/auth/google?redirect=${encodeURIComponent(target)}`;
              }}
              className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
            >
              <GoogleLogo />
              Continue with Google
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;