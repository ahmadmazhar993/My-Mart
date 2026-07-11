import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services';
import { useToast } from '../components/ToastProvider';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { addToast } = useToast();
  const navigate = useNavigate();

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
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send reset link.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-main py-10 animate-fade-in">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-dark mb-2">Forgot Password</h1>
          <p className="text-gray-500 text-sm">Enter your email to receive a password reset link</p>
        </div>

        <div className="bg-white rounded-sm shadow-card p-6 sm:p-8">
          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-sm mb-4 text-sm">{message}</div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-sm mb-4 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-field" placeholder="Enter your email" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">{loading ? 'Sending...' : 'Send Reset Link'}</button>
          </form>

          <p className="text-center mt-6 text-sm text-gray-500">
            Remembered?{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
