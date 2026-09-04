import { useCallback } from 'react';

import { useFormDrawer } from '@/components/admin/useFormDrawer';

type UseAdminFormDrawerOptions = {
  onReset?: () => void;
};

export function useAdminFormDrawer<TId = number>(options: UseAdminFormDrawerOptions = {}) {
  const drawer = useFormDrawer<TId>();

  const handleOpenChange = useCallback((open: boolean) => {
    drawer.setOpen(open);

    if (!open) {
      drawer.close();
      options.onReset?.();
    }
  }, [drawer, options.onReset]);

  const openCreate = useCallback(() => {
    options.onReset?.();
    drawer.openCreate();
  }, [drawer, options.onReset]);

  return {
    ...drawer,
    handleOpenChange,
    openCreate,
  };
}
