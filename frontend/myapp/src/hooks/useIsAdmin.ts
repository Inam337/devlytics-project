import { Roles } from '@/common/Roles';
import { useAuthStore } from '@/stores/auth';

export function useIsAdmin(): boolean {
  const role = useAuthStore(state => state.role);

  return role?.key === Roles.ORGANIZATION_ADMIN;
}
