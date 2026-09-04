import { useEffect, useRef, useState } from 'react';
import { useT } from '@/hooks/use-t';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, KeyRound, LogOut } from '@/components/icons/FluentIcons';

import { AppConstants } from '@/common/AppConstants';
import { cn } from '@/libs/utils';
import { useAuthStore } from '@/stores/auth';
import { useCartStore } from '@/stores/cart';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  return parts
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function HeaderProfileDropdown() {
  const { t } = useT();
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current?.contains(event.target as Node)) {
        return;
      }

      setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  const handleLogout = () => {
    setOpen(false);
    logout();
    useCartStore.getState().reset();
    navigate(AppConstants.Routes.Public.Login, { replace: true });
  };

  const handleChangePassword = () => {
    setOpen(false);
    navigate(AppConstants.Routes.Private.Profile);
  };

  if (!user) {
    return null;
  }

  const initials = getInitials(user.name);

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className={cn(
          'flex items-center gap-2 rounded-full',
          'border border-gray-200 bg-white px-2 py-1.5',
          'hover:bg-gray-50 transition-colors',
        )}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full',
            'bg-gray-400 text-sm font-semibold text-white',
          )}
        >
          {initials}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-gray-600 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open
        ? (
            <div
              role="menu"
              className={cn(
                'absolute right-0 top-full z-50 mt-2 min-w-[220px]',
                'rounded-lg border border-gray-200 bg-white py-2 shadow-lg',
              )}
            >
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                <p className="mt-0.5 truncate text-sm text-gray-600">{user.email}</p>
                <p className="mt-1 text-xs capitalize text-gray-500">
                  {t('header.profile.role', 'Role')}
                  {': '}
                  {user.role}
                </p>
              </div>

              <button
                type="button"
                role="menuitem"
                onClick={handleChangePassword}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-800',
                  'hover:bg-gray-50 transition-colors',
                )}
              >
                <KeyRound className="h-4 w-4 text-gray-700" />
                {t('header.profile.changePassword', 'Change Password')}
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-800',
                  'hover:bg-gray-50 transition-colors',
                )}
              >
                <LogOut className="h-4 w-4 text-gray-700" />
                {t('menu.logout', 'Log out')}
              </button>
            </div>
          )
        : null}
    </div>
  );
}
