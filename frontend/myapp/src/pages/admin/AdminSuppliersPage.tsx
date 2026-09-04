import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useT } from '@/hooks/use-t';

import { useAdminFormDrawer } from '@/components/admin/useAdminFormDrawer';
import { matchesSearchQuery, useAdminTableFilters } from '@/components/admin/useAdminTableFilters';
import { adminInputClass, adminLabelClass } from '@/components/admin/admin-form-styles';
import CommercePageState from '@/components/commerce/CommercePageState';
import { DataTable } from '@/components/ui/DataTable';
import FieldError from '@/components/ui/FieldError';
import FormDrawer from '@/components/ui/FormDrawer';
import PageShell from '@/components/ui/PageShell';
import PageToolbar from '@/components/ui/PageToolbar';
import { actionColumn } from '@/components/ui/data-table-columns';
import type { Supplier } from '@/models';
import {
  createSupplier,
  deleteSupplier,
  listSuppliers,
  updateSupplier,
} from '@/services/suppliers';

const emptyForm = () => ({
  name: '',
  contactNumber: '',
  address: '',
});

export default function AdminSuppliersPage() {
  const { t } = useT();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filters = useAdminTableFilters();

  const resetFormFields = useCallback(() => {
    setForm(emptyForm());
    setFormError(null);
  }, []);

  const drawer = useAdminFormDrawer<number>({ onReset: resetFormFields });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await listSuppliers();

    if (!result.ok) {
      setError(result.error.message);
      setLoading(false);

      return;
    }

    setSuppliers(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startEdit = useCallback((supplier: Supplier) => {
    setForm({
      name: supplier.name,
      contactNumber: supplier.contactNumber ?? '',
      address: supplier.address ?? '',
    });
    setFormError(null);
    drawer.openEdit(supplier.id);
  }, [drawer]);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setFormError(t('admin.nameRequired', 'Name is required'));

      return;
    }

    setSubmitting(true);
    setFormError(null);

    const payload = {
      name: form.name.trim(),
      contactNumber: form.contactNumber.trim() || undefined,
      address: form.address.trim() || undefined,
    };
    const result = drawer.editingId
      ? await updateSupplier(drawer.editingId, payload)
      : await createSupplier(payload);

    if (!result.ok) {
      setFormError(result.error.message);
      setSubmitting(false);

      return;
    }

    setSubmitting(false);
    drawer.close();
    resetFormFields();
    await load();
  };

  const handleDelete = useCallback(async (id: number) => {
    if (!window.confirm(t('admin.confirmDelete', 'Delete this item?'))) {
      return;
    }

    const result = await deleteSupplier(id);

    if (!result.ok) {
      setError(result.error.message);

      return;
    }

    await load();
  }, [load, t]);

  const filteredSuppliers = useMemo(() => suppliers.filter((supplier) => {
    return matchesSearchQuery(filters.draftSearch, [
      supplier.name,
      supplier.contactNumber,
      supplier.address,
    ]);
  }), [suppliers, filters.draftSearch]);

  const columns = useMemo<ColumnDef<Supplier>[]>(() => [
    {
      accessorKey: 'name',
      header: t('admin.name', 'Name'),
      enableSorting: true,
    },
    {
      accessorKey: 'contactNumber',
      header: t('admin.contact', 'Contact'),
      enableSorting: true,
    },
    {
      accessorKey: 'address',
      header: t('admin.address', 'Address'),
      enableSorting: true,
    },
    actionColumn<Supplier>({
      onEdit: startEdit,
      onDelete: supplier => void handleDelete(supplier.id),
      editLabel: t('admin.edit', 'Edit'),
      deleteLabel: t('admin.delete', 'Delete'),
    }),
  ], [t, startEdit, handleDelete]);

  return (
    <CommercePageState
      loading={loading}
      error={error}
      onRetry={load}
      empty={!loading && !error && suppliers.length === 0 && !drawer.open}
      emptyMessage={t('admin.suppliers.empty', 'No suppliers yet.')}
    >
      <PageShell
        maxWidth="full"
        hint={t('admin.suppliers.hint', 'Suppliers are linked when recording purchases.')}
        toolbar={(
          <PageToolbar
            showSearch
            searchValue={filters.draftSearch}
            onSearchChange={filters.setDraftSearch}
            primaryLabel={t('admin.addSupplier', 'Add supplier')}
            onPrimaryClick={drawer.openCreate}
            primaryHidden={drawer.open}
          />
        )}
      >
        <FormDrawer
          open={drawer.open}
          onOpenChange={drawer.handleOpenChange}
          title={drawer.isEditing
            ? t('admin.editSupplier', 'Edit supplier')
            : t('admin.newSupplier', 'New supplier')}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitLabel={t('admin.save', 'Save')}
          cancelLabel={t('admin.cancel', 'Cancel')}
          size="md"
        >
          <div>
            <label className={adminLabelClass}>
              {t('admin.name', 'Name')}
            </label>
            <input
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              className={adminInputClass}
              autoFocus
            />
          </div>
          <div>
            <label className={adminLabelClass}>
              {t('admin.contact', 'Contact')}
            </label>
            <input
              value={form.contactNumber}
              onChange={e => setForm(prev => ({ ...prev, contactNumber: e.target.value }))}
              className={adminInputClass}
            />
          </div>
          <div>
            <label className={adminLabelClass}>
              {t('admin.address', 'Address')}
            </label>
            <textarea
              value={form.address}
              onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
              rows={2}
              className={adminInputClass}
            />
          </div>
          <FieldError msg={formError} variant="form" />
        </FormDrawer>

        <DataTable
          columns={columns}
          data={filteredSuppliers}
          showPagination
          itemsPerPage={10}
          emptyMessage={t('admin.suppliers.tableEmpty', 'No suppliers match your filters.')}
        />
      </PageShell>
    </CommercePageState>
  );
}
