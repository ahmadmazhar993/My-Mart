import React from 'react';

import Layout from './components/Layout';

import RequireAdmin from './components/RequireAdmin';

import AdminLayout from './components/admin/AdminLayout';

import Home from './pages/Home';

import Products from './pages/Products';

import ProductDetail from './pages/ProductDetail';

import Login from './pages/Login';

import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

import Profile from './pages/Profile';

import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';

import Checkout from './pages/Checkout';

import Cart from './pages/Cart';

import Wishlist from './pages/Wishlist';

import Reviews from './pages/Reviews';

import AccountSettings from './pages/AccountSettings';

import HelpCenter from './pages/HelpCenter';

import InfoPage from './pages/InfoPage';

import AdminDashboard from './pages/admin/AdminDashboard';

import AdminProducts from './pages/admin/AdminProducts';

import AdminCategories from './pages/admin/AdminCategories';

import AdminOrders from './pages/admin/AdminOrders';

import AdminUsers from './pages/admin/AdminUsers';

import './styles/index.css';

import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Routes>
      <Route element={<RequireAdmin />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="users" element={<AdminUsers />} />
        </Route>
      </Route>

      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/settings" element={<AccountSettings />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/help" element={<HelpCenter />} />
        <Route path="/pages/:slug" element={<InfoPage />} />
      </Route>
    </Routes>
  );
}

export default App;