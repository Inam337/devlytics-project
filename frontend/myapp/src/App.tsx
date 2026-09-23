import { useEffect } from 'react';

import '@/libs/i18n';

import AppRoutes from '@/routes/AppRoutes';
import { useAuthStore } from '@/stores/auth';

export default function App() {
  const hasHydrated = useAuthStore(state => state.hasHydrated);
  const bootstrap = useAuthStore(state => state.bootstrap);

  // Validates the persisted session against GET /auth/me once hydration
  // completes — a stale/invalid token is cleared rather than trusted forever.
  useEffect(() => {
    if (hasHydrated) {
      void bootstrap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]);

  return <AppRoutes />;
}
