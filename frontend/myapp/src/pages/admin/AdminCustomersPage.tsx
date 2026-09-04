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
import type { Customer } from '@/models';
import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer,
} from '@/services/customers';

const emptyForm = () => ({
  name: '',
  email: '',
  phone: '',
  address: '',
});

export default function AdminCustomersPage() {
  const { t } = useT();
  const [customers, setCustomers] = useState<Customer[]>([]);
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

    const result = await listCustomers();

    if (!result.ok) {
      setError(result.error.message);
      setLoading(false);

      return;
    }

    setCustomers(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startEdit = useCallback((customer: Customer) => {
    setForm({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address ?? '',
    });
    setFormError(null);
    drawer.openEdit(customer.id);
  }, [drawer]);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setFormError(t('admin.customerFormRequired', 'Name, email, and phone are required'));

      return;
    }

    setSubmitting(true);
    setFormError(null);

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim() || undefined,
    };
    const result = drawer.editingId
      ? await updateCustomer(drawer.editingId, payload)
      : await createCustomer(payload);

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

    const result = await deleteCustomer(id);

    if (!result.ok) {
      setError(result.error.message);

      return;
    }

    await load();
  }, [load, t]);

  const filteredCustomers = useMemo(() => customers.filter((customer) => {
    return matchesSearchQuery(filters.draftSearch, [
      customer.name,
      customer.email,
      customer.phone,
      customer.address,
    ]);
  }), [customers, filters.draftSearch]);

  const columns = useMemo<ColumnDef<Customer>[]>(() => [
    {
      accessorKey: 'name',
      header: t('admin.name', 'Name'),
      enableSorting: true,
    },
    {
      accessorKey: 'email',
      header: t('admin.email', 'Email'),
      enableSorting: true,
    },
    {
      accessorKey: 'phone',
      header: t('admin.phone', 'Phone'),
      enableSorting: true,
    },
    {
      accessorKey: 'address',
      header: t('admin.address', 'Address'),
      enableSorting: true,
    },
    actionColumn<Customer>({
      onEdit: startEdit,
      onDelete: customer => void handleDelete(customer.id),
      editLabel: t('admin.edit', 'Edit'),
      deleteLabel: t('admin.delete', 'Delete'),
    }),
  ], [t, startEdit, handleDelete]);

  return (
    <CommercePageState
      loading={loading}
      error={error}
      onRetry={load}
      empty={!loading && !error && customers.length === 0 && !drawer.open}
      emptyMessage={t('admin.customers.empty', 'No B2B customers yet.')}
    >
      <PageShell
        maxWidth="full"
        hint={t('admin.customers.hint', 'Maintain B2B customer records (name, email, phone, address).')}
        toolbar={(
          <PageToolbar
            showSearch
            searchValue={filters.draftSearch}
            onSearchChange={filters.setDraftSearch}
            primaryLabel={t('admin.addCustomer', 'Add customer')}
            onPrimaryClick={drawer.openCreate}
            primaryHidden={drawer.open}
          />
        )}
      >
        <FormDrawer
          open={drawer.open}
          onOpenChange={drawer.handleOpenChange}
          title={drawer.isEditing
            ? t('admin.editCustomer', 'Edit customer')
            : t('admin.newCustomer', 'New customer')}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitLabel={t('admin.save', 'Save')}
          cancelLabel={t('admin.cancel', 'Cancel')}
          size="md"
        >
          <div className="grid gap-3 sm:grid-cols-2">
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
                {t('admin.email', 'Email')}
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                className={adminInputClass}
              />
            </div>
            <div>
              <label className={adminLabelClass}>
                {t('admin.phone', 'Phone')}
              </label>
              <input
                value={form.phone}
                onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                className={adminInputClass}
              />
            </div>
            <div>
              <label className={adminLabelClass}>
                {t('admin.address', 'Address')}
              </label>
              <input
                value={form.address}
                onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                className={adminInputClass}
              />
            </div>
          </div>
          <FieldError msg={formError} variant="form" />
        </FormDrawer>

        <DataTable
          columns={columns}
          data={filteredCustomers}
          showPagination
          itemsPerPage={10}
          emptyMessage={t('admin.customers.tableEmpty', 'No customers match your filters.')}
        />
      </PageShell>
    </CommercePageState>
  );
}
