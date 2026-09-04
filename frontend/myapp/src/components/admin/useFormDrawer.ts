import { useCallback, useState } from 'react';

export function useFormDrawer<TId = number>() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<TId | null>(null);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setOpen(true);
  }, []);

  const openEdit = useCallback((id: TId) => {
    setEditingId(id);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setEditingId(null);
  }, []);

  return {
    open,
    editingId,
    isEditing: editingId != null,
    setOpen,
    openCreate,
    openEdit,
    close,
  };
}
