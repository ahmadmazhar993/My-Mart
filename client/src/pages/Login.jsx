import React, { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { authService } from '../services';
import { setAuthToken } from '../services/api';
import { API_BASE, API_VERSION } from '../services/api';
import { useAuthStore } from '../store';
import { useToast } from '../components/ToastProvider';
import BrandLoader from '../components/BrandLoader';
import AuthShell from '../components/auth/AuthShell';
import AuthField from '../components/auth/AuthField';
import usePageMeta from '../hooks/usePageMeta';
import { AlertCircle, CheckCircle2, Lock, Mail } from 'lucide-react';

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

  // Sign-in pages stay out of search results.
  usePageMeta({ title: 'Login', description: 'Log in to your AHM Mart account.', path: '/login', noindex: true });

  if (isAuthenticated) {
    const destination = redirect && redirect !== '/' && redirect !== '/login'
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

    setErrors(() => validateField(field, value));
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
      const destination = redirect && redirect !== '/' && redirect !== '/login'
        ? redirect
        : authUser?.role === 'Admin'
          ? '/admin'
          : '/';
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
    <AuthShell
      title="Welcome back"
      subtitle="Log in to your AHM Mart account"
      footer={(
        <>
          Don&apos;t have an account?{' '}
          <Link to="/register" className="inline-flex min-h-[44px] items-center font-semibold text-primary-700 hover:underline">
            Register here
          </Link>
        </>
      )}
    >
      {successMessage && (
        <div role="status" className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          {successMessage}
        </div>
      )}
      {error && (
        <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-1 items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
            {error.toLowerCase().includes('email not verified') && (
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendLoading}
                className="min-h-[44px] flex-shrink-0 px-2 text-sm font-semibold text-primary-700 hover:underline"
              >
                {resendLoading ? 'Sending...' : 'Resend'}
              </button>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AuthField
          id="login-email"
          label="Email"
          icon={Mail}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => handleChange('email', e.target.value)}
          error={errors.email}
          placeholder="Enter your email"
        />

        <AuthField
          id="login-password"
          label="Password"
          icon={Lock}
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => handleChange('password', e.target.value)}
          error={errors.password}
          placeholder="Enter your password"
        />

        <div className="text-right">
          <Link to="/forgot-password" className="inline-flex min-h-[44px] items-center text-sm font-medium text-primary-700 hover:underline">
            Forgot password?
          </Link>
        </div>

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-primary-600 text-base font-semibold text-white shadow-sm transition hover:bg-primary-700 active:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading && (
                <BrandLoader variant="button" />
              )}
              {loading ? 'Logging in...' : 'Login'}
            </button>

            <div className="my-5 flex items-center gap-3" role="separator" aria-label="or">
              <div className="flex-1 border-t border-gray-200" />
              <span className="text-xs font-medium text-gray-400">OR</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            <button
              type="button"
              onClick={() => {
                const target = `${window.location.origin}${redirect || '/'}`;
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

export default Login;
