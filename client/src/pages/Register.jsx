import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services';
import { useAuthStore } from '../store';

const Register = () => {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

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
      // After registration, redirect user to login page instead of auto-login
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-main py-10 animate-fade-in">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-dark mb-2">Create Account</h1>
          <p className="text-gray-500 text-sm">Join AHM Mart for the best shopping experience</p>
        </div>

        <div className="bg-white rounded-sm shadow-card p-6 sm:p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-sm mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5">First Name</label>
                <input
                  type="text"
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  required
                  className="input-field"
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  required
                  className="input-field"
                  placeholder="Last name"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="input-field"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                className="input-field"
                placeholder="Create a password"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                className="input-field"
                placeholder="Confirm your password"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
