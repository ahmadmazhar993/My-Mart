import React, { useEffect } from 'react';
import { useAuthStore } from '../store';
import { authService } from '../services';
import { setAuthToken } from '../services/api';

const AuthInitializer = ({ children }) => {
  const { login, logout } = useAuthStore();

  useEffect(() => {
    // prevent duplicate initialization (React StrictMode mounts twice in dev)
    if (window.__AHM_AUTH_INIT_DONE) return;
    if (window.__AHM_AUTH_INIT_STARTED) return;
    window.__AHM_AUTH_INIT_STARTED = true;
    // Always attempt to fetch current user — the server may authenticate via httpOnly cookie set by OAuth
    const token = localStorage.getItem('token');
    if (token) setAuthToken(token);

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
      .catch(() => {
        // not authenticated
        logout();
      });

    const onUnauthorized = () => {
      logout();
    };

    window.addEventListener('api:unauthorized', onUnauthorized);
    return () => window.removeEventListener('api:unauthorized', onUnauthorized);
  }, []); // run once

  return <>{children}</>;
};

export default AuthInitializer;
