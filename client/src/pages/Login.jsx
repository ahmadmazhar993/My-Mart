import React, { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services';
import { useAuthStore } from '../store';
import { useToast } from '../components/ToastProvider';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, user } = useAuthStore();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  if (isAuthenticated) {
    const destination = redirect && redirect !== '/login'
      ? redirect
      : user?.role === 'Admin'
        ? '/admin'
        : '/';

    return <Navigate to={destination} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authService.login(email, password);
      const payload = response.data?.data || response.data;
      const authUser = payload.user || payload;
      const token = payload.token || response.data?.token;

      login(authUser, token);
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

  return (
    <div className="container-main py-10 animate-fade-in">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-dark mb-2">Welcome Back</h1>
          <p className="text-gray-500 text-sm">Login to your AHM Mart account</p>
        </div>

        <div className="bg-white rounded-sm shadow-card p-6 sm:p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-sm mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-field"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-field"
                placeholder="Enter your password"
              />
            </div>
            <div className="text-right">
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">Forgot password?</Link>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-gray-500">
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
