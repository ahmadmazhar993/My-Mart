import React, { lazy, Suspense } from 'react';

import Layout from './components/Layout';

import RequireAdmin from './components/RequireAdmin';

import AdminLayout from './components/admin/AdminLayout';

const Home = lazy(() => import('./pages/Home'));
const Products = lazy(() => import('./pages/Products'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const Profile = lazy(() => import('./pages/Profile'));
const Orders = lazy(() => import('./pages/Orders'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Cart = lazy(() => import('./pages/Cart'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const Reviews = lazy(() => import('./pages/Reviews'));
const AccountSettings = lazy(() => import('./pages/AccountSettings'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));
const InfoPage = lazy(() => import('./pages/InfoPage'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminCreateOrder = lazy(() => import('./pages/admin/AdminCreateOrder'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminSales = lazy(() => import('./pages/admin/AdminSales'));

import './styles/index.css';

import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-gray-500">Loading...</div>}>
      <Routes>
        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="sales" element={<AdminSales />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/create" element={<AdminCreateOrder />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>
        </Route>

        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:identifier" element={<ProductDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
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
    </Suspense>
  );
}

export default App;