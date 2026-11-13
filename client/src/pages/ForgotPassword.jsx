import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, KeyRound, Mail } from 'lucide-react';
import { authService } from '../services';
import { useToast } from '../components/ToastProvider';
import BrandLoader from '../components/BrandLoader';
import AuthShell from '../components/auth/AuthShell';
import AuthField from '../components/auth/AuthField';
import usePageMeta from '../hooks/usePageMeta';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { addToast } = useToast();
  const navigate = useNavigate();

  usePageMeta({ title: 'Forgot Password', description: 'Reset your AHM Mart password.', path: '/forgot-password', noindex: true });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await authService.forgotPassword(email);
      const msg = res.data?.message || res.data?.data || 'If an account exists, a reset link was sent.';
      setMessage(msg);
      addToast(msg);
      // Pass the message to the login page so it's shown there as a success banner
      navigate('/login', { state: { message: msg } });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send reset link.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a reset link"
      footer={(
        <>
          Remembered it?{' '}
          <Link to="/login" className="inline-flex min-h-[44px] items-center font-semibold text-primary-700 hover:underline">Login</Link>
        </>
      )}
    >
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 ring-1 ring-primary-100">
        <KeyRound className="h-7 w-7" aria-hidden="true" />
      </div>

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

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          id="forgot-email"
          label="Email"
          icon={Mail}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Enter your email"
        />

        <button
          type="submit"
          disabled={loading}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-primary-600 text-base font-semibold text-white shadow-sm transition hover:bg-primary-700 active:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading && <BrandLoader variant="button" />}
          {loading ? 'Sending...' : 'Send reset link'}
        </button>
      </form>
    </AuthShell>
  );
};

export default ForgotPassword;
