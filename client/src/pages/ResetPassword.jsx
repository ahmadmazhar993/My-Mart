import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { authService } from '../services';
import { useToast } from '../components/ToastProvider';
import BrandLoader from '../components/BrandLoader';
import AuthShell from '../components/auth/AuthShell';
import AuthField from '../components/auth/AuthField';
import usePageMeta from '../hooks/usePageMeta';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { addToast } = useToast();

  usePageMeta({ title: 'Reset Password', description: 'Set a new AHM Mart password.', path: '/reset-password', noindex: true });

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Invalid or missing reset token.');
        setValidating(false);
        return;
      }

      try {
        await authService.validateResetToken(token);
        setIsValidToken(true);
      } catch (err) {
        setError(err.response?.data?.message || 'Reset token is invalid or expired.');
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError('Missing reset token.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword({
        token,
        new_password: password,
        confirm_new_password: confirmPassword,
      });
      const successMessage = 'Password reset successfully. You can sign in with your new password.';
      setMessage(successMessage);
      addToast(successMessage, 'success');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to reset password.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Set a new password for your AHM Mart account"
      footer={<Link to="/login" className="inline-flex min-h-[44px] items-center font-semibold text-primary-700 hover:underline">Back to login</Link>}
    >
      {message && (
        <div role="status" className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {validating ? (
        <div role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-gray-600">
          <BrandLoader variant="button" tone="brand" size={16} />
          Validating reset link...
        </div>
      ) : isValidToken ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthField
            id="reset-password"
            label="New password"
            icon={Lock}
            type="password"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            hint="At least 6 characters."
            placeholder="Enter new password"
          />
          <AuthField
            id="reset-confirm-password"
            label="Confirm password"
            icon={Lock}
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
            placeholder="Confirm new password"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-primary-600 text-base font-semibold text-white shadow-sm transition hover:bg-primary-700 active:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading && <BrandLoader variant="button" />}
            {loading ? 'Updating...' : 'Save new password'}
          </button>
        </form>
      ) : (
        <div className="py-6 text-center">
          <p className="mb-4 text-sm text-gray-500">Your reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700">
            Request a new reset link
          </Link>
        </div>
      )}
    </AuthShell>
  );
};

export default ResetPassword;
