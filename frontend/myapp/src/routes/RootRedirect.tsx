import { Navigate } from 'react-router-dom';

import { AppConstants } from '@/common/AppConstants';
import AuthRouteFallback from '@/components/auth/AuthRouteFallback';
import { getAccessToken } from '@/libs/auth-tokens';
import { selectIsAuthenticated, useAuthStore } from '@/stores/auth';

/** Sends `/` and unknown public paths to dashboard (authenticated) or login. */
export default function RootRedirect() {
  const hasHydrated = useAuthStore(state => state.hasHydrated);
  const isAuthenticated = useAuthStore(
    state => selectIsAuthenticated(state) || getAccessToken() != null,
  );

  if (!hasHydrated) {
    return <AuthRouteFallback />;
  }

  return (
    <Navigate
      to={
        isAuthenticated
          ? AppConstants.Routes.Private.Dashboard
          : AppConstants.Routes.Public.Login
      }
      replace
    />
  );
}
