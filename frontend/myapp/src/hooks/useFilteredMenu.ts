import type { MenuItem } from '@/common/MenuData';
import { useAuthStore } from '@/stores/auth';

function isVisibleForRole(roles: string[] | undefined, userRole: string): boolean {
  if (!roles || roles.length === 0) {
    return true;
  }

  return roles.includes(userRole);
}

/** Filters sidebar items by `roles` on menu entries (admin-only sections use `roles: ['admin']`). */
export function useFilteredMenu(menuItems: MenuItem[]): MenuItem[] {
  const userRole = useAuthStore(state => state.user?.role ?? 'user');

  return menuItems
    .filter(item => isVisibleForRole(item.roles, userRole))
    .map(item => ({
      ...item,
      items: item.items?.filter(sub => isVisibleForRole(sub.roles, userRole)),
    }))
    .filter(item => !item.items || item.items.length > 0);
}
