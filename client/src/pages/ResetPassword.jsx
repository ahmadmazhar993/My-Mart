import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services';
import { useToast } from '../components/ToastProvider';

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
    <div className="container-main py-10 animate-fade-in">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-dark mb-2">Reset Password</h1>
          <p className="text-gray-500 text-sm">Set a new password for your AHM Mart account</p>
        </div>

        <div className="bg-white rounded-sm shadow-card p-6 sm:p-8">
          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-sm mb-4 text-sm">{message}</div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-sm mb-4 text-sm">{error}</div>
          )}

          {validating ? (
            <div className="text-center py-10 text-gray-600">Validating reset token...</div>
          ) : isValidToken ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5">New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input-field"
                  placeholder="Enter new password"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="input-field"
                  placeholder="Confirm new password"
                  disabled={loading}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? 'Updating...' : 'Save New Password'}
              </button>
            </form>
          ) : (
            <div className="text-center py-10">
              <p className="text-sm text-gray-500 mb-4">Your reset token is invalid or has expired.</p>
              <Link to="/forgot-password" className="text-primary font-semibold hover:underline">Request a new reset link</Link>
            </div>
          )}

          <p className="text-center mt-6 text-sm text-gray-500">
            <Link to="/login" className="text-primary font-semibold hover:underline">Back to login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
