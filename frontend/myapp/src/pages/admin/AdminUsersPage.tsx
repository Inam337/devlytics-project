import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import AdminFilterField, { adminFilterSelectClass } from '@/components/admin/AdminFilterField';
import { useAdminFormDrawer } from '@/components/admin/useAdminFormDrawer';
import { matchesSearchQuery, useAdminTableFilters } from '@/components/admin/useAdminTableFilters';
import { adminInputClass, adminLabelClass } from '@/components/admin/admin-form-styles';
import CommercePageState from '@/components/commerce/CommercePageState';
import { DataTable } from '@/components/ui/DataTable';
import FieldError from '@/components/ui/FieldError';
import FormDrawer from '@/components/ui/FormDrawer';
import PageShell from '@/components/ui/PageShell';
import PageToolbar from '@/components/ui/PageToolbar';
import { actionColumn, dateColumn, statusColumn } from '@/components/ui/data-table-columns';
import { useT } from '@/hooks/use-t';
import type { User } from '@/models';
import {
  createUser,
  deleteUser,
  listUsers,
  updateUser,
  updateUserStatus,
} from '@/services/users';

const emptyForm = () => ({
  name: '',
  email: '',
  password: '',
});

export default function AdminUsersPage() {
  const { t } = useT();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  const filters = useAdminTableFilters({
    initialFilters: { role: '', status: '' },
  });
  const resetFormFields = useCallback(() => {
    setForm(emptyForm());
    setFormError(null);
  }, []);
  const drawer = useAdminFormDrawer<number>({ onReset: resetFormFields });
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await listUsers();

    if (result.ok === false) {
      setError(result.error.message);
      setLoading(false);

      return;
    }

    setUsers(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startEdit = useCallback((user: User) => {
    setForm({
      name: user.name,
      email: user.email,
      password: '',
    });
    setFormError(null);
    drawer.openEdit(user.id);
  }, [drawer]);
  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setFormError(t('admin.userFormRequired', 'Name and email are required'));

      return;
    }

    if (!drawer.editingId && !form.password.trim()) {
      setFormError(t('admin.passwordRequired', 'Password is required for new users'));

      return;
    }

    setSubmitting(true);
    setFormError(null);

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      ...(form.password.trim() ? { password: form.password } : {}),
    };
    const result = drawer.editingId
      ? await updateUser(drawer.editingId, payload)
      : await createUser({
          name: payload.name,
          email: payload.email,
          password: form.password,
        });

    if (result.ok === false) {
      setFormError(result.error.message);
      setSubmitting(false);

      return;
    }

    setSubmitting(false);
    drawer.close();
    resetFormFields();
    await load();
  };

  const handleToggleStatus = useCallback(async (user: User) => {
    setStatusUpdatingId(user.id);

    const result = await updateUserStatus(user.id, { isActive: !user.status });

    if (result.ok === false) {
      setError(result.error.message);
      setStatusUpdatingId(null);

      return;
    }

    setStatusUpdatingId(null);
    await load();
  }, [load]);
  const handleDelete = useCallback(async (id: number) => {
    if (!window.confirm(t('admin.confirmDelete', 'Delete this item?'))) {
      return;
    }

    const result = await deleteUser(id);

    if (result.ok === false) {
      setError(result.error.message);

      return;
    }

    await load();
  }, [load, t]);
  const roleOptions = useMemo(() => {
    const roles = new Set(users.map(user => user.role));

    return Array.from(roles).sort();
  }, [users]);
  const filteredUsers = useMemo(() => users.filter((user) => {
    if (!matchesSearchQuery(filters.appliedSearch, [user.name, user.email])) {
      return false;
    }

    if (filters.appliedFilters.role && user.role !== filters.appliedFilters.role) {
      return false;
    }

    if (filters.appliedFilters.status === 'active' && !user.status) {
      return false;
    }

    if (filters.appliedFilters.status === 'inactive' && user.status) {
      return false;
    }

    return true;
  }), [users, filters.appliedSearch, filters.appliedFilters]);
  const columns = useMemo<ColumnDef<User>[]>(() => [
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
    statusColumn<User>(
      row => row.role,
      {
        id: 'role',
        header: t('admin.role', 'Role'),
        variant: 'neutral',
      },
    ),
    statusColumn<User>(
      row => (row.status
        ? t('admin.active', 'Active')
        : t('admin.inactive', 'Inactive')),
      {
        id: 'status',
        header: t('admin.status', 'Status'),
        variant: row => (row.status ? 'success' : 'danger'),
      },
    ),
    dateColumn<User>(
      row => row.createdAt,
      {
        id: 'createdAt',
        header: t('admin.createdAt', 'Created'),
        enableSorting: true,
      },
    ),
    {
      id: 'toggleStatus',
      header: t('admin.account', 'Account'),
      enableSorting: false,
      cell: ({ row }) => (
        <button
          type="button"
          className="text-sm text-gray-500 transition-colors hover:text-zentro-teal disabled:opacity-50"
          disabled={statusUpdatingId === row.original.id}
          onClick={() => void handleToggleStatus(row.original)}
        >
          {row.original.status
            ? t('admin.deactivate', 'Deactivate')
            : t('admin.activate', 'Activate')}
        </button>
      ),
    },
    actionColumn<User>({
      onEdit: startEdit,
      onDelete: user => void handleDelete(user.id),
      editLabel: t('admin.edit', 'Edit'),
      deleteLabel: t('admin.delete', 'Delete'),
    }),
  ], [t, statusUpdatingId, startEdit, handleToggleStatus, handleDelete]);

  return (
    <CommercePageState
      loading={loading}
      error={error}
      onRetry={load}
      empty={!loading && !error && users.length === 0 && !drawer.open}
      emptyMessage={t('admin.users.empty', 'No app users listed yet.')}
    >
      <PageShell
        maxWidth="full"
        hint={t('admin.users.hint', 'Manage login accounts. Roles are assigned by the backend (default user).')}
        toolbar={(
          <PageToolbar
            showSearch
            searchValue={filters.draftSearch}
            onSearchChange={filters.setDraftSearch}
            showFilters
            filtersOpen={filters.filtersOpen}
            onFiltersOpenChange={filters.setFiltersOpen}
            onApplyFilters={filters.applyFilters}
            onClearFilters={filters.clearFilters}
            filterContent={(
              <>
                <AdminFilterField
                  label={t('admin.role', 'Role')}
                  htmlFor="filter-role"
                >
                  <select
                    id="filter-role"
                    value={filters.draftFilters.role}
                    onChange={e => filters.setDraftFilter('role', e.target.value)}
                    className={adminFilterSelectClass()}
                  >
                    <option value="">{t('filters.all', 'All')}</option>
                    {roleOptions.map(role => (
                      <option
                        key={role}
                        value={role}
                      >
                        {role}
                      </option>
                    ))}
                  </select>
                </AdminFilterField>
                <AdminFilterField
                  label={t('admin.status', 'Status')}
                  htmlFor="filter-status"
                >
                  <select
                    id="filter-status"
                    value={filters.draftFilters.status}
                    onChange={e => filters.setDraftFilter('status', e.target.value)}
                    className={adminFilterSelectClass()}
                  >
                    <option value="">{t('filters.all', 'All')}</option>
                    <option value="active">{t('admin.active', 'Active')}</option>
                    <option value="inactive">{t('admin.inactive', 'Inactive')}</option>
                  </select>
                </AdminFilterField>
              </>
            )}
            primaryLabel={t('admin.addUser', 'Add user')}
            onPrimaryClick={drawer.openCreate}
            primaryHidden={drawer.open}
          />
        )}
      >
        <FormDrawer
          open={drawer.open}
          onOpenChange={drawer.handleOpenChange}
          title={drawer.isEditing
            ? t('admin.editUser', 'Edit user')
            : t('admin.newUser', 'New user')}
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
              {drawer.isEditing
                ? t('admin.newPasswordOptional', 'New password (optional)')
                : t('admin.password', 'Password')}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
              className={adminInputClass}
              autoComplete="new-password"
            />
          </div>
          <FieldError msg={formError} variant="form" />
        </FormDrawer>

        <DataTable
          columns={columns}
          data={filteredUsers}
          showPagination
          itemsPerPage={10}
          emptyMessage={t('admin.users.tableEmpty', 'No users match your filters.')}
        />
      </PageShell>
    </CommercePageState>
  );
}
