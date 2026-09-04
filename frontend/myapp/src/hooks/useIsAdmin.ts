import { Roles } from '@/common/Roles';
import { useAuthStore } from '@/stores/auth';

export function useIsAdmin(): boolean {
  const user = useAuthStore(state => state.user);

  return user?.role === Roles.ADMIN;
}
