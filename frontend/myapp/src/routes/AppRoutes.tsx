import { Routes, Route } from 'react-router-dom';

import { AppConstants } from '@/common/AppConstants';
import {
  AcceptInvitationPage,
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
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

      {/*
        Token-based, one-off flows — reachable regardless of the current
        session's auth state (an already-signed-in user may open a reset or
        invitation link too), so these sit outside the PublicRoutes guard
        that redirects authenticated users to the dashboard.
      */}
      <Route
        path={AppConstants.Routes.Public.ResetPassword}
        element={<ResetPasswordPage />}
      />
      <Route
        path={AppConstants.Routes.Public.AcceptInvitation}
        element={<AcceptInvitationPage />}
      />

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
