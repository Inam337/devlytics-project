import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { AppConstants } from '@/common/AppConstants';
import AuthRouteFallback from '@/components/auth/AuthRouteFallback';
import MainLayout from '@/components/layouts/MainLayout';
import { getAccessToken } from '@/libs/auth-tokens';
import { selectIsAuthenticated, useAuthStore } from '@/stores/auth';

export default function PrivateRoutes() {
  const hasHydrated = useAuthStore(state => state.hasHydrated);
  const setHasHydrated = useAuthStore(state => state.setHasHydrated);
  const isAuthenticated = useAuthStore(
    state => selectIsAuthenticated(state) || getAccessToken() != null,
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
        <MainLayout>
          <Outlet />
        </MainLayout>
      )
    : (
        <Navigate
          to={AppConstants.Routes.Public.Login}
          replace
        />
      );
}
