import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useT } from '@/hooks/use-t';

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
import { actionColumn, statusColumn } from '@/components/ui/data-table-columns';
import { formatMoney } from '@/libs/format-money';
import type { Category, Product } from '@/models';
import { ProductType } from '@/models';
import { listCategories } from '@/services/categories';
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
} from '@/services/products';

const PRODUCT_TYPES = [ProductType.GOODS, ProductType.SERVICE, ProductType.DIGITAL] as const;

const emptyForm = () => ({
  name: '',
  description: '',
  sku: '',
  price: '',
  unit: 'piece',
  reorderLevel: '10',
  type: ProductType.GOODS,
  categoryId: '',
});

export default function AdminProductsPage() {
  const { t } = useT();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filters = useAdminTableFilters({
    initialFilters: { category: '', type: '', status: '' },
    liveSearch: true,
  });

  const resetFormFields = useCallback(() => {
    setForm(emptyForm());
    setFormError(null);
  }, []);

  const drawer = useAdminFormDrawer<number>({ onReset: resetFormFields });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [productsResult, categoriesResult] = await Promise.all([
      listProducts(),
      listCategories(),
    ]);

    if (!productsResult.ok) {
      setError(productsResult.error.message);
      setLoading(false);

      return;
    }

    setProducts(productsResult.data);

    if (categoriesResult.ok) {
      setCategories(categoriesResult.data);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startEdit = useCallback((product: Product) => {
    setForm({
      name: product.name,
      description: product.description ?? '',
      sku: product.sku ?? '',
      price: String(product.price),
      unit: product.unit,
      reorderLevel: String(product.reorderLevel),
      type: product.type,
      categoryId: product.category?.id ? String(product.category.id) : '',
    });
    setFormError(null);
    drawer.openEdit(product.id);
  }, [drawer]);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.price || !form.unit.trim()) {
      setFormError(t('admin.productFormRequired', 'Name, price, and unit are required'));

      return;
    }

    setSubmitting(true);
    setFormError(null);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      sku: form.sku.trim() || undefined,
      price: Number.parseFloat(form.price),
      unit: form.unit.trim(),
      reorderLevel: Number.parseInt(form.reorderLevel, 10) || 0,
      type: form.type,
      categoryId: form.categoryId ? Number.parseInt(form.categoryId, 10) : undefined,
    };

    const result = drawer.editingId
      ? await updateProduct(drawer.editingId, payload)
      : await createProduct(payload);

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

  const handleDeactivate = useCallback(async (id: number) => {
    if (!window.confirm(t('admin.confirmDeactivateProduct', 'Deactivate this product? It will be hidden from the shop catalog.'))) {
      return;
    }

    const result = await deleteProduct(id);

    if (!result.ok) {
      setError(result.error.message);

      return;
    }

    await load();
  }, [load, t]);

  const filteredProducts = useMemo(() => products.filter((product) => {
    if (!matchesSearchQuery(filters.appliedSearch, [product.name, product.sku])) {
      return false;
    }

    if (filters.appliedFilters.category) {
      const categoryId = product.category?.id ? String(product.category.id) : '';

      if (categoryId !== filters.appliedFilters.category) {
        return false;
      }
    }

    if (filters.appliedFilters.type && product.type !== filters.appliedFilters.type) {
      return false;
    }

    if (filters.appliedFilters.status === 'active' && !product.isActive) {
      return false;
    }

    if (filters.appliedFilters.status === 'inactive' && product.isActive) {
      return false;
    }

    return true;
  }), [products, filters.appliedSearch, filters.appliedFilters]);

  const columns = useMemo<ColumnDef<Product>[]>(() => [
    {
      accessorKey: 'name',
      header: t('admin.name', 'Name'),
      enableSorting: true,
    },
    {
      accessorKey: 'sku',
      header: 'SKU',
      enableSorting: true,
      cell: ({ row }) => row.original.sku ?? '—',
    },
    {
      accessorKey: 'price',
      header: t('admin.price', 'Price'),
      enableSorting: true,
      cell: ({ row }) => formatMoney(row.original.price),
    },
    statusColumn<Product>(
      row => row.category?.name ?? t('admin.noCategory', 'None'),
      {
        id: 'category',
        header: t('admin.category', 'Category'),
        variant: 'neutral',
      },
    ),
    statusColumn<Product>(
      row => row.type,
      {
        id: 'type',
        header: t('admin.type', 'Type'),
        variant: 'neutral',
      },
    ),
    statusColumn<Product>(
      row => (row.isActive
        ? t('admin.active', 'Active')
        : t('admin.inactive', 'Inactive')),
      {
        id: 'status',
        header: t('admin.status', 'Status'),
        variant: row => (row.isActive ? 'success' : 'danger'),
      },
    ),
    actionColumn<Product>({
      onEdit: startEdit,
      onDelete: product => void handleDeactivate(product.id),
      editLabel: t('admin.edit', 'Edit'),
      deleteLabel: t('admin.deactivate', 'Deactivate'),
    }),
  ], [t, startEdit, handleDeactivate]);

  return (
    <CommercePageState
      loading={loading}
      error={error}
      onRetry={load}
      empty={!loading && !error && products.length === 0 && !drawer.open}
      emptyMessage={t('admin.products.empty', 'No active products. Create one for the catalog.')}
    >
      <PageShell
        maxWidth="full"
        hint={t('admin.products.hint', 'Create and edit products. Delete soft-deactivates (hidden from shop).')}
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
                  label={t('admin.category', 'Category')}
                  htmlFor="filter-category"
                >
                  <select
                    id="filter-category"
                    value={filters.draftFilters.category}
                    onChange={e => filters.setDraftFilter('category', e.target.value)}
                    className={adminFilterSelectClass()}
                  >
                    <option value="">{t('filters.all', 'All')}</option>
                    {categories.map(category => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ))}
                  </select>
                </AdminFilterField>
                <AdminFilterField
                  label={t('admin.type', 'Type')}
                  htmlFor="filter-type"
                >
                  <select
                    id="filter-type"
                    value={filters.draftFilters.type}
                    onChange={e => filters.setDraftFilter('type', e.target.value)}
                    className={adminFilterSelectClass()}
                  >
                    <option value="">{t('filters.all', 'All')}</option>
                    {PRODUCT_TYPES.map(type => (
                      <option
                        key={type}
                        value={type}
                      >
                        {type}
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
            primaryLabel={t('admin.addProduct', 'Add product')}
            onPrimaryClick={drawer.openCreate}
            primaryHidden={drawer.open}
          />
        )}
      >
        <FormDrawer
          open={drawer.open}
          onOpenChange={drawer.handleOpenChange}
          title={drawer.isEditing
            ? t('admin.editProduct', 'Edit product')
            : t('admin.newProduct', 'New product')}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitLabel={t('admin.save', 'Save')}
          cancelLabel={t('admin.cancel', 'Cancel')}
          size="lg"
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
              <label className={adminLabelClass}>SKU</label>
              <input
                value={form.sku}
                onChange={e => setForm(prev => ({ ...prev, sku: e.target.value }))}
                className={adminInputClass}
              />
            </div>
            <div>
              <label className={adminLabelClass}>
                {t('admin.price', 'Price')}
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))}
                className={adminInputClass}
              />
            </div>
            <div>
              <label className={adminLabelClass}>
                {t('admin.unit', 'Unit')}
              </label>
              <input
                value={form.unit}
                onChange={e => setForm(prev => ({ ...prev, unit: e.target.value }))}
                className={adminInputClass}
              />
            </div>
            <div>
              <label className={adminLabelClass}>
                {t('admin.type', 'Type')}
              </label>
              <select
                value={form.type}
                onChange={e => setForm(prev => ({
                  ...prev,
                  type: e.target.value as typeof form.type,
                }))}
                className={adminInputClass}
              >
                {PRODUCT_TYPES.map(type => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={adminLabelClass}>
                {t('admin.category', 'Category')}
              </label>
              <select
                value={form.categoryId}
                onChange={e => setForm(prev => ({ ...prev, categoryId: e.target.value }))}
                className={adminInputClass}
              >
                <option value="">
                  {t('admin.noCategory', 'None')}
                </option>
                {categories.map(category => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={adminLabelClass}>
                {t('admin.reorderLevel', 'Reorder level')}
              </label>
              <input
                type="number"
                min={0}
                value={form.reorderLevel}
                onChange={e => setForm(prev => ({ ...prev, reorderLevel: e.target.value }))}
                className={adminInputClass}
              />
            </div>
          </div>
          <div>
            <label className={adminLabelClass}>
              {t('admin.description', 'Description')}
            </label>
            <textarea
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className={adminInputClass}
            />
          </div>
          <FieldError msg={formError} variant="form" />
        </FormDrawer>

        <DataTable
          columns={columns}
          data={filteredProducts}
          showPagination
          itemsPerPage={10}
          emptyMessage={t('admin.products.tableEmpty', 'No products match your filters.')}
        />
      </PageShell>
    </CommercePageState>
  );
}
