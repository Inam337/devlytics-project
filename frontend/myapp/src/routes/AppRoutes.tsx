import { Routes, Route } from 'react-router-dom';

import { AppConstants } from '@/common/AppConstants';
import {
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
} from '@/pages/accounts';
import Dashboard from '@/pages/Dashboard';
import Profile from '@/pages/Profile';

import PublicRoutes from './PublicRoutes';
import PrivateRoutes from './PrivateRoutes';
import RootRedirect from './RootRedirect';

/**
 * Minimal placeholder route tree. Real Devlytics screens replace Dashboard/Profile
 * (and grow this tree) as they're built — keep the Public/Private guard pattern.
 */
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
