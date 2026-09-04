import { Routes, Route, Navigate } from 'react-router-dom';

import { AppConstants } from '@/common/AppConstants';
import {
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
} from '@/pages/accounts';
import Dashboard from '@/pages/Dashboard';
import Profile from '@/pages/Profile';
import {
  AdminCategoriesPage,
  AdminProductsPage,
  AdminCustomersPage,
  AdminPurchasesPage,
  AdminSalesPage,
  AdminStockPage,
  AdminSuppliersPage,
  AdminUsersPage,
} from '@/pages/admin';
import {
  CartPage,
  CategoriesPage,
  CheckoutPage,
  OrderDetailPage,
  OrdersPage,
  ProductDetailPage,
  ProductsPage,
} from '@/pages/commerce';

import AdminRoutes from './AdminRoutes';
import PublicRoutes from './PublicRoutes';
import PrivateRoutes from './PrivateRoutes';
import RootRedirect from './RootRedirect';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicRoutes />}>
        <Route
          path={AppConstants.Routes.Public.Login}
          element={<LoginPage />}
        />
        <Route
          path={AppConstants.Routes.Public.Register}
          element={<RegisterPage />}
        />
        <Route
          path={AppConstants.Routes.Public.ForgotPassword}
          element={<ForgotPasswordPage />}
        />
      </Route>

      <Route element={<PrivateRoutes />}>
        <Route
          path={AppConstants.Routes.Private.Dashboard}
          element={<Dashboard />}
        />
        <Route
          path={AppConstants.Routes.Private.Profile}
          element={<Profile />}
        />
        <Route
          path={AppConstants.Routes.Private.Products}
          element={<ProductsPage />}
        />
        <Route
          path={`${AppConstants.Routes.Private.Products}/:id`}
          element={<ProductDetailPage />}
        />
        <Route
          path={AppConstants.Routes.Private.Categories}
          element={<CategoriesPage />}
        />
        <Route
          path={AppConstants.Routes.Private.Cart}
          element={<CartPage />}
        />
        <Route
          path={AppConstants.Routes.Private.Checkout}
          element={<CheckoutPage />}
        />
        <Route
          path={AppConstants.Routes.Private.Orders}
          element={<OrdersPage />}
        />
        <Route
          path={`${AppConstants.Routes.Private.Orders}/:id`}
          element={<OrderDetailPage />}
        />
        <Route element={<AdminRoutes />}>
          <Route
            path={AppConstants.Routes.Private.Admin.Categories}
            element={<AdminCategoriesPage />}
          />
          <Route
            path={AppConstants.Routes.Private.Admin.Products}
            element={<AdminProductsPage />}
          />
          <Route
            path={AppConstants.Routes.Private.Admin.Suppliers}
            element={<AdminSuppliersPage />}
          />
          <Route
            path={AppConstants.Routes.Private.Admin.Stock}
            element={<AdminStockPage />}
          />
          <Route
            path={AppConstants.Routes.Private.Admin.Purchases}
            element={<AdminPurchasesPage />}
          />
          <Route
            path={AppConstants.Routes.Private.Admin.Sales}
            element={<AdminSalesPage />}
          />
          <Route
            path={AppConstants.Routes.Private.Admin.Customers}
            element={<AdminCustomersPage />}
          />
          <Route
            path={AppConstants.Routes.Private.Admin.Users}
            element={<AdminUsersPage />}
          />
        </Route>
        <Route
          path="*"
          element={(
            <Navigate
              to={AppConstants.Routes.Private.Dashboard}
              replace
            />
          )}
        />
      </Route>

      <Route
        path="/"
        element={<RootRedirect />}
      />
      <Route
        path="*"
        element={<RootRedirect />}
      />
    </Routes>
  );
}
