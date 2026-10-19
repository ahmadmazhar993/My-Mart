import React, { lazy, Suspense, useEffect, useState } from 'react';
import Layout from './components/Layout';
import RequireAdmin from './components/RequireAdmin';
import RequireSeller from './components/seller/RequireSeller';
import SellerLayout from './components/seller/SellerLayout';
import AdminLayout from './components/admin/AdminLayout';
import PageLoader from './components/PageLoader';
import RealtimeBridge from './components/RealtimeBridge';
import { useToast } from './components/ToastProvider';
import axiosClient from './services/api';

const APP_VERSION_STORAGE_KEY = 'appVersion';
const shouldCheckForUpdates = typeof window !== 'undefined';

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
const ContactPage = lazy(() => import('./pages/ContactPage'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogArticle = lazy(() => import('./pages/BlogArticle'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminCreateOrder = lazy(() => import('./pages/admin/AdminCreateOrder'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminSales = lazy(() => import('./pages/admin/AdminSales'));
const AdminSellers = lazy(() => import('./pages/admin/AdminSellers'));
const AdminSellerDetail = lazy(() => import('./pages/admin/AdminSellerDetail'));
const AdminProductReview = lazy(() => import('./pages/admin/AdminProductReview'));
const SellerApply = lazy(() => import('./pages/seller/SellerApply'));
const SellerDashboard = lazy(() => import('./pages/seller/SellerDashboard'));
const SellerProducts = lazy(() => import('./pages/seller/SellerProducts'));
const SellerProductForm = lazy(() => import('./pages/seller/SellerProductForm'));
const SellerInventory = lazy(() => import('./pages/seller/SellerInventory'));
const SellerOrders = lazy(() => import('./pages/seller/SellerOrders'));
const SellerOrderDetail = lazy(() => import('./pages/seller/SellerOrderDetail'));
const SellerStoreSettings = lazy(() => import('./pages/seller/SellerStoreSettings'));
const SellerEarnings = lazy(() => import('./pages/seller/SellerEarnings'));
const SellerAnalytics = lazy(() => import('./pages/seller/SellerAnalytics'));
const SellerReturns = lazy(() => import('./pages/seller/SellerReturns'));
const SellerReturnDetail = lazy(() => import('./pages/seller/SellerReturns').then((m) => ({ default: m.SellerReturnDetail })));
const AdminFinance = lazy(() => import('./pages/admin/AdminFinance'));
const AdminReturns = lazy(() => import('./pages/admin/AdminReturns'));
const MyReturns = lazy(() => import('./pages/MyReturns'));

import './styles/index.css';

import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

function App() {
  const { addToast } = useToast();
  const location = useLocation();
  const [showVersionUpdateModal, setShowVersionUpdateModal] = useState(false);
  const [serverAppVersion, setServerAppVersion] = useState('unknown');

  useEffect(() => {
    if (showVersionUpdateModal) {
      window.__APP_UPDATE_BLOCKED__ = true;
      sessionStorage.setItem('app-update-blocked', 'true');
    } else {
      window.__APP_UPDATE_BLOCKED__ = false;
      sessionStorage.removeItem('app-update-blocked');
    }
  }, [showVersionUpdateModal]);

  useEffect(() => {
    if (!shouldCheckForUpdates) return undefined;

    const syncVersion = async () => {
      try {
        const response = await axiosClient.get('/app-version');
        const currentVersion = response?.data?.version || response?.data?.appVersion || 'unknown';
        setServerAppVersion(currentVersion);

        const previousVersion = localStorage.getItem(APP_VERSION_STORAGE_KEY);

        if (!currentVersion || currentVersion === 'unknown') {
          return;
        }

        if (!previousVersion) {
          localStorage.setItem(APP_VERSION_STORAGE_KEY, currentVersion);
          return;
        }

        const hasNewVersion = previousVersion !== currentVersion;
        if (hasNewVersion) {
          setShowVersionUpdateModal(true);
          setServerAppVersion(currentVersion);
          addToast('A new update is available. Please refresh to continue.', 'success');
        }
      } catch (error) {
        console.warn('App version check failed:', error);
      }
    };

    syncVersion();
    return undefined;
  }, [addToast, location.pathname]);

  const handleRefreshApp = () => {
    if (serverAppVersion && serverAppVersion !== 'unknown') {
      localStorage.setItem(APP_VERSION_STORAGE_KEY, serverAppVersion);
    }
    sessionStorage.removeItem('app-update-blocked');
    window.__APP_UPDATE_BLOCKED__ = false;
    window.location.reload();
  };

  return (
    <>
      <RealtimeBridge />
      {showVersionUpdateModal && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Update available</p>
            <h3 className="mt-3 text-xl font-bold text-gray-900">New version ready</h3>
            <p className="mt-2 text-sm text-gray-600">
              New version has been deployed. Refresh to load the latest UI and functionality updates.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={handleRefreshApp}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Refresh now
              </button>
            </div>
          </div>
        </div>
      )}

      <Suspense fallback={<PageLoader />}>
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
              <Route path="sellers" element={<AdminSellers />} />
              <Route path="sellers/:id" element={<AdminSellerDetail />} />
              <Route path="seller-products" element={<AdminProductReview />} />
              <Route path="finance" element={<AdminFinance />} />
              <Route path="returns" element={<AdminReturns />} />
            </Route>
          </Route>

          <Route element={<RequireSeller />}>
            <Route path="/seller" element={<SellerLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<SellerDashboard />} />
              <Route path="products" element={<SellerProducts />} />
              <Route path="products/new" element={<SellerProductForm />} />
              <Route path="products/:id/edit" element={<SellerProductForm />} />
              <Route path="inventory" element={<SellerInventory />} />
              <Route path="orders" element={<SellerOrders />} />
              <Route path="orders/:id" element={<SellerOrderDetail />} />
              <Route path="earnings" element={<SellerEarnings />} />
              <Route path="analytics" element={<SellerAnalytics />} />
              <Route path="returns" element={<SellerReturns />} />
              <Route path="returns/:id" element={<SellerReturnDetail />} />
              <Route path="store-settings" element={<SellerStoreSettings />} />
            </Route>
          </Route>

          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:identifier" element={<ProductDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/seller/apply" element={<SellerApply />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route path="/returns" element={<MyReturns />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/settings" element={<AccountSettings />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/pages/contact" element={<ContactPage />} />
            <Route path="/pages/:slug" element={<InfoPage />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogArticle />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}

export default App;