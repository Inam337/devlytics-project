import { Navigate, Outlet } from 'react-router-dom';

import { AppConstants } from '@/common/AppConstants';
import { useIsAdmin } from '@/hooks/useIsAdmin';

export default function AdminRoutes() {
  const isAdmin = useIsAdmin();

  if (!isAdmin) {
    return (
      <Navigate
        to={AppConstants.Routes.Private.Dashboard}
        replace
      />
    );
  }

  return <Outlet />;
}
