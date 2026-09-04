import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { AppConstants } from '@/common/AppConstants';
import AuthRouteFallback from '@/components/auth/AuthRouteFallback';
import { getAccessToken } from '@/libs/auth-tokens';
import { selectIsAuthenticated, useAuthStore } from '@/stores/auth';

export default function PublicRoutes() {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const setHasHydrated = useAuthStore((state) => state.setHasHydrated);
  const isAuthenticated = useAuthStore(
    (state) => selectIsAuthenticated(state) || getAccessToken() != null,
  );

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHasHydrated(true);
    }
    return useAuthStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
    });
  }, [setHasHydrated]);

  if (!hasHydrated) {
    return <AuthRouteFallback />;
  }

  return isAuthenticated
    ? (
        <Navigate
          to={AppConstants.Routes.Private.Dashboard}
          replace
        />
      )
    : (
        <Outlet />
      );
}
