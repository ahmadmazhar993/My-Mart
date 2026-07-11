import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store';

const RequireAdmin = () => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login?redirect=/admin" replace />;
  }

  if (user?.role !== 'Admin') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default RequireAdmin;
