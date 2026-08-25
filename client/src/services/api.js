import axios from 'axios';

const rawApiBase = import.meta.env.VITE_API_BASE
  || (import.meta.env.VITE_API_URL
    ? String(import.meta.env.VITE_API_URL).replace(/\/api\/v1\/?$/, '')
    : undefined)
  || 'http://0.0.0.0:5001';

export const API_BASE = String(rawApiBase).replace(/\/+$/, '');
export const API_VERSION = '/api/v1';

const axiosClient = axios.create({
  baseURL: `${API_BASE}${API_VERSION}`,
  timeout: 25000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

export const isTokenExpired = (token) => {
  if (!token || typeof token !== 'string') return true;

  try {
    const parts = token.split('.');
    if (parts.length < 2) return true;

    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    );

    if (!payload || typeof payload.exp !== 'number') return false;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
};

export const setAuthToken = (token) => {
  if (token) {
    axiosClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete axiosClient.defaults.headers.common.Authorization;
  }
};

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (!token) {
    delete config.headers.Authorization;
    return config;
  }

  if (isTokenExpired(token)) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuthToken(null);
    window.dispatchEvent(new CustomEvent('api:unauthorized'));
    return Promise.reject(new Error('Token expired'));
  }

  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('api:unauthorized'));
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
