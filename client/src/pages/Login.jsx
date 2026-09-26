import React, { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { authService } from '../services';
import { setAuthToken } from '../services/api';
import { API_BASE, API_VERSION } from '../services/api';
import { useAuthStore } from '../store';
import { useToast } from '../components/ToastProvider';

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

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const { login, isAuthenticated, user } = useAuthStore();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const location = useLocation();
  const successMessage = location.state?.message || null;

  if (isAuthenticated) {
    const destination = redirect && redirect !== '/login'
      ? redirect
      : user?.role === 'Admin'
        ? '/admin'
        : '/';

    return <Navigate to={destination} replace />;
  }

  const validateField = (field, value) => {
    const nextErrors = { ...errors };
    const trimmedValue = value.trim();

    if (field === 'email') {
      if (!trimmedValue) {
        nextErrors.email = 'Email is required.';
      } else if (!/^\S+@\S+\.\S+$/.test(trimmedValue)) {
        nextErrors.email = 'Please enter a valid email address.';
      } else {
        delete nextErrors.email;
      }
    }

    if (field === 'password') {
      if (!trimmedValue) {
        nextErrors.password = 'Password is required.';
      } else {
        delete nextErrors.password;
      }
    }

    return nextErrors;
  };

  const validateForm = () => {
    const nextErrors = {};
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail) {
      nextErrors.email = 'Email is required.';
    } else if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!trimmedPassword) {
      nextErrors.password = 'Password is required.';
    }

    return nextErrors;
  };

  const handleChange = (field, value) => {
    if (field === 'email') {
      setEmail(value);
    } else {
      setPassword(value);
    }

    setErrors((prev) => validateField(field, value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validateForm();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setError('Please fix the highlighted fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authService.login(email.trim(), password.trim());
      const payload = response.data?.data || response.data;
      const authUser = payload.user || payload;
      const token = payload.token || response.data?.token;

      login(authUser, token);
      if (token) setAuthToken(token);
      addToast('Login successful.');
      const destination = authUser?.role === 'Admin' && redirect === '/'
        ? '/admin'
        : redirect;
      navigate(destination);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Login failed. Please check your credentials.');
      addToast('Login failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/\S+@\S+\.\S+/.test(trimmedEmail)) {
      addToast('Please enter a valid email to resend verification.', 'error');
      return;
    }
    setResendLoading(true);
    try {
      const resp = await authService.resendVerification(trimmedEmail);
      addToast(resp.data?.message || 'Verification email sent.');
      setError('Verification email sent. Please check your inbox.');
    } catch (err) {
      addToast(err.response?.data?.message || 'Unable to resend verification email.', 'error');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="container-main animate-fade-in py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-2xl font-extrabold tracking-tight text-dark">Welcome Back</h1>
          <p className="text-sm text-gray-500">Login to your AHM Mart account</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card sm:p-8">
          {successMessage && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {successMessage}
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-1 items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
                {error.toLowerCase().includes('email not verified') && (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendLoading}
                    className="flex-shrink-0 text-sm font-semibold text-primary hover:underline"
                  >
                    {resendLoading ? 'Sending...' : 'Resend'}
                  </button>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Email</label>
              <div className="relative">
                <EmailIcon />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={`w-full rounded-lg border bg-white py-2.5 pl-10 pr-3.5 text-sm shadow-sm transition focus:outline-none focus:ring-2 ${
                    errors.email
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                      : 'border-gray-200 focus:border-primary focus:ring-primary-100'
                  }`}
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
                  value={password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className={`w-full rounded-lg border bg-white py-2.5 pl-10 pr-3.5 text-sm shadow-sm transition focus:outline-none focus:ring-2 ${
                    errors.password
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                      : 'border-gray-200 focus:border-primary focus:ring-primary-100'
                  }`}
                  placeholder="Enter your password"
                />
              </div>
              {errors.password && <p className="mt-1.5 text-xs text-red-600">{errors.password}</p>}
            </div>

            <div className="text-right">
              <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600 active:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              {loading ? 'Logging in...' : 'Login'}
            </button>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="flex-1 border-t border-gray-200" />
              <span className="text-xs font-medium text-gray-400">OR</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            {/* Google Login */}
            <button
              type="button"
              onClick={() => {
                const target = `${window.location.origin}${redirect || '/'}`;
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
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;