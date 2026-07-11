import React, { useEffect } from 'react';
import { useAuthStore } from '../store';
import { authService } from '../services';
import { setAuthToken } from '../services/api';

const AuthInitializer = ({ children }) => {
  const { login, logout } = useAuthStore();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setAuthToken(token);
      authService.getCurrentUser()
        .then((res) => {
          const payload = res.data?.data || res.data;
          const currentUser = payload.user || payload;
          login(currentUser, token);
        })
        .catch(() => {
          // token invalid or user removed - ensure logout
          logout();
        });
    }

    const onUnauthorized = () => {
      logout();
    };

    window.addEventListener('api:unauthorized', onUnauthorized);
    return () => window.removeEventListener('api:unauthorized', onUnauthorized);
  }, []); // run once

  return <>{children}</>;
};

export default AuthInitializer;
