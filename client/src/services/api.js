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
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

export const setAuthToken = (token) => {
  if (token) {
    axiosClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete axiosClient.defaults.headers.common.Authorization;
  }
};

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
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
