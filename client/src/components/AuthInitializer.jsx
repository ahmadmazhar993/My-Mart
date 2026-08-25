import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store';
import { authService } from '../services';
import { setAuthToken, isTokenExpired } from '../services/api';
import { useNavigate } from 'react-router-dom';

const AuthInitializer = ({ children }) => {
  const { login, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sessionExpiredOpen, setSessionExpiredOpen] = useState(false);

  useEffect(() => {
    // prevent duplicate initialization (React StrictMode mounts twice in dev)
    if (window.__AHM_AUTH_INIT_DONE) return;
    if (window.__AHM_AUTH_INIT_STARTED) return;
    window.__AHM_AUTH_INIT_STARTED = true;
    // Always attempt to fetch current user — the server may authenticate via httpOnly cookie set by OAuth
    const token = localStorage.getItem('token');
    if (token) {
      if (isTokenExpired(token)) {
        logout();
        setSessionExpiredOpen(true);
        window.__AHM_AUTH_INIT_DONE = true;
        return;
      }
      setAuthToken(token);
    }

    authService.getCurrentUser()
      .then((res) => {
        const payload = res.data?.data || res.data;
        const currentUser = payload.user || payload;
        const returnedToken = payload.token || res.data?.token || token || null;
        if (returnedToken) {
          login(currentUser, returnedToken);
        } else {
          // no token returned (server only uses cookie) — set user in store without persisting token
          useAuthStore.getState().setUser(currentUser);
          // mark as authenticated in-memory
          useAuthStore.setState({ isAuthenticated: true });
        }
        // mark init done to avoid duplicate calls
        window.__AHM_AUTH_INIT_DONE = true;
      })
      .catch((error) => {
        const message = error?.response?.data?.message || error?.message || '';
        const isExpiredSession = error?.response?.status === 401 || /token expired|invalid token|no token provided/i.test(message);

        logout();

        if (isExpiredSession) {
          setSessionExpiredOpen(true);
        }
      });

  }, [login, logout]); // run once

  useEffect(() => {
    const onUnauthorized = () => setSessionExpiredOpen(true);
    window.addEventListener('api:unauthorized', onUnauthorized);
    return () => window.removeEventListener('api:unauthorized', onUnauthorized);
  }, []);

  const handleRelogin = () => {
    // clear local auth state and redirect to login page
    logout();
    setSessionExpiredOpen(false);
    navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
  };

  return (
    <>
      {children}

      {sessionExpiredOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md">
          <div className="max-w-md w-full bg-white rounded-lg p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Session expired</h3>
            <p className="text-sm text-gray-600 mb-4">Your session has expired. Please log in again to continue.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setSessionExpiredOpen(false); }} className="px-3 py-2 rounded-md border">Close</button>
              <button type="button" onClick={handleRelogin} className="px-3 py-2 rounded-md bg-primary text-white">Login again</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AuthInitializer;
