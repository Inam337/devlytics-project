import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useT } from '@/hooks/use-t';

import { useAdminFormDrawer } from '@/components/admin/useAdminFormDrawer';
import { matchesSearchQuery, useAdminTableFilters } from '@/components/admin/useAdminTableFilters';
import { adminInputClass, adminLabelClass } from '@/components/admin/admin-form-styles';
import CommercePageState from '@/components/commerce/CommercePageState';
import FieldError from '@/components/ui/FieldError';
import FormDrawer from '@/components/ui/FormDrawer';
import { DataTable } from '@/components/ui/DataTable';
import { actionColumn } from '@/components/ui/data-table-columns';
import PageShell from '@/components/ui/PageShell';
import PageToolbar from '@/components/ui/PageToolbar';
import type { Category } from '@/models';
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '@/services/categories';

export default function AdminCategoriesPage() {
  const { t } = useT();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filters = useAdminTableFilters();

  const resetFormFields = useCallback(() => {
    setName('');
    setDescription('');
    setFormError(null);
  }, []);

  const drawer = useAdminFormDrawer<number>({ onReset: resetFormFields });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await listCategories();

    if (!result.ok) {
      setError(result.error.message);
      setLoading(false);

      return;
    }

    setCategories(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startEdit = useCallback((category: Category) => {
    setName(category.name);
    setDescription(category.description ?? '');
    setFormError(null);
    drawer.openEdit(category.id);
  }, [drawer]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setFormError(t('admin.nameRequired', 'Name is required'));

      return;
    }

    setSubmitting(true);
    setFormError(null);

    const payload = { name: name.trim(), description: description.trim() || undefined };
    const result = drawer.editingId
      ? await updateCategory(drawer.editingId, payload)
      : await createCategory(payload);

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

    const result = await deleteCategory(id);

    if (!result.ok) {
      setError(result.error.message);

      return;
    }

    await load();
  }, [load, t]);

  const filteredCategories = useMemo(() => categories.filter((category) => {
    return matchesSearchQuery(filters.draftSearch, [
      category.name,
      category.description,
    ]);
  }), [categories, filters.draftSearch]);

  const columns = useMemo<ColumnDef<Category>[]>(() => [
    {
      accessorKey: 'name',
      header: t('admin.name', 'Name'),
      enableSorting: true,
    },
    {
      accessorKey: 'description',
      header: t('admin.description', 'Description'),
      enableSorting: true,
      cell: ({ row }) => (
        <span className="text-gray-500">
          {row.original.description ?? '—'}
        </span>
      ),
    },
    {
      id: 'productCount',
      header: t('admin.products', 'Products'),
      enableSorting: true,
      accessorFn: row => row.products?.length ?? 0,
      cell: ({ row }) => (
        <span className="text-gray-500">
          {t('commerce.categoryProductCount', '{count} products', {
            count: row.original.products?.length ?? 0,
          })}
        </span>
      ),
    },
    actionColumn<Category>({
      onEdit: startEdit,
      onDelete: category => void handleDelete(category.id),
      editLabel: t('admin.edit', 'Edit'),
      deleteLabel: t('admin.delete', 'Delete'),
    }),
  ], [t, startEdit, handleDelete]);

  return (
    <CommercePageState
      loading={loading}
      error={error}
      onRetry={load}
      empty={!loading && !error && categories.length === 0 && !drawer.open}
      emptyMessage={t('admin.categories.empty', 'No categories yet. Create one to organize products.')}
    >
      <PageShell
        maxWidth="full"
        hint={t('admin.categories.hint', 'Manage catalog categories used when creating products.')}
        toolbar={(
          <PageToolbar
            showSearch
            searchValue={filters.draftSearch}
            onSearchChange={filters.setDraftSearch}
            primaryLabel={t('admin.addCategory', 'Add category')}
            onPrimaryClick={drawer.openCreate}
            primaryHidden={drawer.open}
          />
        )}
      >
        <FormDrawer
          open={drawer.open}
          onOpenChange={drawer.handleOpenChange}
          title={drawer.isEditing
            ? t('admin.editCategory', 'Edit category')
            : t('admin.newCategory', 'New category')}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitLabel={t('admin.save', 'Save')}
          cancelLabel={t('admin.cancel', 'Cancel')}
          size="md"
        >
          <div>
            <label
              htmlFor="category-name"
              className={adminLabelClass}
            >
              {t('admin.name', 'Name')}
            </label>
            <input
              id="category-name"
              value={name}
              onChange={e => setName(e.target.value)}
              className={adminInputClass}
              autoFocus
            />
          </div>
          <div>
            <label
              htmlFor="category-description"
              className={adminLabelClass}
            >
              {t('admin.description', 'Description')}
            </label>
            <textarea
              id="category-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className={adminInputClass}
            />
          </div>
          <FieldError msg={formError} variant="form" />
        </FormDrawer>

        <DataTable
          columns={columns}
          data={filteredCategories}
          showPagination
          itemsPerPage={10}
          emptyMessage={t('admin.categories.tableEmpty', 'No categories match your filters.')}
        />
      </PageShell>
    </CommercePageState>
  );
}
