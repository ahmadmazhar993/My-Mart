import React, { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { authService } from '../services';
import { setAuthToken } from '../services/api';
import { API_BASE, API_VERSION } from '../services/api';
import { useAuthStore } from '../store';
import { useToast } from '../components/ToastProvider';

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
    <div className="container-main py-10 animate-fade-in">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-dark mb-2">Welcome Back</h1>
          <p className="text-gray-500 text-sm">Login to your AHM Mart account</p>
        </div>

        <div className="bg-white rounded-sm shadow-card p-6 sm:p-8">
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-sm mb-4 text-sm">
              {successMessage}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-sm mb-4 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">{error}</div>
                {error.toLowerCase().includes('email not verified') && (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendLoading}
                    className="text-primary font-semibold text-sm hover:underline"
                  >
                    {resendLoading ? 'Sending...' : 'Resend'}
                  </button>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={`input-field ${errors.email ? 'border-red-300' : ''}`}
                placeholder="Enter your email"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => handleChange('password', e.target.value)}
                className={`input-field ${errors.password ? 'border-red-300' : ''}`}
                placeholder="Enter your password"
              />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
            </div>
            <div className="text-right">
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">Forgot password?</Link>
            </div>
            {/* <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Logging in...' : 'Login'}
            </button>
            <div className="mt-2">
              <button
                type="button"
                onClick={() => {
                  const target = `${window.location.origin}${redirect || '/'}`;
                  window.location.href =
                    `${API_BASE}${API_VERSION}/auth/google?redirect=${encodeURIComponent(target)}`;
                }}
                className="flex justify-center w-full"
              >
                <img
                  src="/google-icon.svg"
                  alt="Sign in with Google"
                  className="h-10"
                />
              </button>
            </div> */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 border-t border-gray-200" />
              <span className="text-xs text-gray-400 font-medium">OR</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            {/* Google Login */}
            <div>
              <button
                type="button"
                onClick={() => {
                  const target = `${window.location.origin}${redirect || '/'}`;

                  window.location.href =
                    `${API_BASE}${API_VERSION}/auth/google?redirect=${encodeURIComponent(target)}`;
                }}
                className="flex justify-center w-full"
              >
                <img
                  src="/google-icon.svg"
                  alt="Sign in with Google"
                  className="h-10"
                />
              </button>
            </div>
          </form>

          <p className="text-center mt-5 text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-primary font-semibold hover:underline">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
