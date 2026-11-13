import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services';
import { API_BASE, API_VERSION } from '../services/api';
import BrandLoader from '../components/BrandLoader';
import AuthShell from '../components/auth/AuthShell';
import AuthField from '../components/auth/AuthField';
import usePageMeta from '../hooks/usePageMeta';
import { AlertCircle, Lock, Mail, User } from 'lucide-react';

const GoogleLogo = () => (
  <svg className="h-5 w-5" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
  </svg>
);

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

  usePageMeta({ title: 'Create Account', description: 'Create your AHM Mart account.', path: '/register', noindex: true });

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
    setErrors(() => validateField(name, value));
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
      await authService.register({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        password: form.password,
        confirm_password: form.confirmPassword,
      });

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
    <AuthShell
      title="Create your account"
      subtitle="Join AHM Mart to order and track your purchases"
      footer={(
        <>
          Already have an account?{' '}
          <Link to="/login" className="inline-flex min-h-[44px] items-center font-semibold text-primary-700 hover:underline">
            Login
          </Link>
        </>
      )}
    >
      {error && (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
          <AuthField
            id="reg-first-name"
            label="First name"
            icon={User}
            name="first_name"
            autoComplete="given-name"
            value={form.first_name}
            onChange={handleChange}
            error={errors.first_name}
            placeholder="First name"
          />
          <AuthField
            id="reg-last-name"
            label="Last name"
            icon={User}
            name="last_name"
            autoComplete="family-name"
            value={form.last_name}
            onChange={handleChange}
            error={errors.last_name}
            placeholder="Last name"
          />
        </div>

        <AuthField
          id="reg-email"
          label="Email"
          icon={Mail}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
          placeholder="Enter your email"
        />

        <AuthField
          id="reg-password"
          label="Password"
          icon={Lock}
          type="password"
          name="password"
          autoComplete="new-password"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
          hint="At least 6 characters."
          placeholder="Create a password"
        />

        <AuthField
          id="reg-confirm-password"
          label="Confirm password"
          icon={Lock}
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
          placeholder="Confirm your password"
        />

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-primary-600 text-base font-semibold text-white shadow-sm transition hover:bg-primary-700 active:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading && (
                <BrandLoader variant="button" />
              )}
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>

            <div className="my-5 flex items-center gap-3" role="separator" aria-label="or">
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
              className="flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
            >
              <GoogleLogo />
              Continue with Google
            </button>
      </form>
    </AuthShell>
  );
};

export default Register;
