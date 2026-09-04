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
import { actionColumn } from '@/components/ui/data-table-columns';
import type { Product, Stock } from '@/models';
import { listProducts } from '@/services/products';
import {
  createStock,
  deleteStock,
  listStocks,
  updateStock,
} from '@/services/stock';

const emptyForm = (products: Product[]) => ({
  productId: String(products[0]?.id ?? ''),
  quantity: '0',
  location: '',
});

export default function AdminStockPage() {
  const { t } = useT();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ productId: '', quantity: '0', location: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filters = useAdminTableFilters({
    initialFilters: { location: '' },
    liveSearch: true,
  });

  const resetFormFields = useCallback(() => {
    setForm(emptyForm(products));
    setFormError(null);
  }, [products]);

  const drawer = useAdminFormDrawer<number>({ onReset: resetFormFields });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [stocksResult, productsResult] = await Promise.all([
      listStocks(),
      listProducts(),
    ]);

    if (!stocksResult.ok) {
      setError(stocksResult.error.message);
      setLoading(false);

      return;
    }

    setStocks(stocksResult.data);

    if (productsResult.ok) {
      setProducts(productsResult.data);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startEdit = useCallback((stock: Stock) => {
    setForm({
      productId: String(stock.product?.id ?? ''),
      quantity: String(stock.quantity),
      location: stock.location,
    });
    setFormError(null);
    drawer.openEdit(stock.id);
  }, [drawer]);

  const handleSubmit = async () => {
    const productId = Number.parseInt(form.productId, 10);

    if (!productId || !form.location.trim()) {
      setFormError(t('admin.stockFormRequired', 'Product and location are required'));

      return;
    }

    setSubmitting(true);
    setFormError(null);

    const payload = {
      productId,
      quantity: Number.parseInt(form.quantity, 10) || 0,
      location: form.location.trim(),
    };

    const result = drawer.editingId
      ? await updateStock(drawer.editingId, payload)
      : await createStock(payload);

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

    const result = await deleteStock(id);

    if (!result.ok) {
      setError(result.error.message);

      return;
    }

    await load();
  }, [load, t]);

  const locationOptions = useMemo(() => {
    const locations = new Set(stocks.map(stock => stock.location).filter(Boolean));

    return Array.from(locations).sort();
  }, [stocks]);

  const filteredStocks = useMemo(() => stocks.filter((stock) => {
    if (!matchesSearchQuery(filters.appliedSearch, [
      stock.product?.name,
      stock.location,
    ])) {
      return false;
    }

    if (filters.appliedFilters.location && stock.location !== filters.appliedFilters.location) {
      return false;
    }

    return true;
  }), [stocks, filters.appliedSearch, filters.appliedFilters]);

  const columns = useMemo<ColumnDef<Stock>[]>(() => [
    {
      id: 'productName',
      accessorFn: row => row.product?.name ?? '',
      header: t('admin.product', 'Product'),
      enableSorting: true,
      cell: ({ row }) => row.original.product?.name ?? '—',
    },
    {
      accessorKey: 'quantity',
      header: t('admin.quantity', 'Qty'),
      enableSorting: true,
    },
    {
      accessorKey: 'location',
      header: t('admin.location', 'Location'),
      enableSorting: true,
    },
    actionColumn<Stock>({
      onEdit: startEdit,
      onDelete: stock => void handleDelete(stock.id),
      editLabel: t('admin.edit', 'Edit'),
      deleteLabel: t('admin.delete', 'Delete'),
    }),
  ], [t, startEdit, handleDelete]);

  return (
    <CommercePageState
      loading={loading}
      error={error}
      onRetry={load}
      empty={!loading && !error && stocks.length === 0 && !drawer.open}
      emptyMessage={t('admin.stock.empty', 'No stock entries yet.')}
    >
      <PageShell
        maxWidth="full"
        hint={t('admin.stock.hint', 'Track quantity per product and warehouse location.')}
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
              <AdminFilterField
                label={t('admin.location', 'Location')}
                htmlFor="filter-location"
              >
                <select
                  id="filter-location"
                  value={filters.draftFilters.location}
                  onChange={e => filters.setDraftFilter('location', e.target.value)}
                  className={adminFilterSelectClass()}
                >
                  <option value="">{t('filters.all', 'All')}</option>
                  {locationOptions.map(location => (
                    <option
                      key={location}
                      value={location}
                    >
                      {location}
                    </option>
                  ))}
                </select>
              </AdminFilterField>
            )}
            primaryLabel={t('admin.addStock', 'Add stock')}
            onPrimaryClick={drawer.openCreate}
            primaryHidden={drawer.open || products.length === 0}
          />
        )}
      >
        <FormDrawer
          open={drawer.open}
          onOpenChange={drawer.handleOpenChange}
          title={drawer.isEditing
            ? t('admin.editStock', 'Edit stock')
            : t('admin.newStock', 'New stock entry')}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitLabel={t('admin.save', 'Save')}
          cancelLabel={t('admin.cancel', 'Cancel')}
          size="md"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={adminLabelClass}>
                {t('admin.product', 'Product')}
              </label>
              <select
                value={form.productId}
                onChange={e => setForm(prev => ({ ...prev, productId: e.target.value }))}
                className={adminInputClass}
                disabled={drawer.isEditing}
                autoFocus
              >
                {products.map(product => (
                  <option
                    key={product.id}
                    value={product.id}
                  >
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={adminLabelClass}>
                {t('admin.quantity', 'Qty')}
              </label>
              <input
                type="number"
                min={0}
                value={form.quantity}
                onChange={e => setForm(prev => ({ ...prev, quantity: e.target.value }))}
                className={adminInputClass}
              />
            </div>
            <div>
              <label className={adminLabelClass}>
                {t('admin.location', 'Location')}
              </label>
              <input
                value={form.location}
                onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))}
                className={adminInputClass}
              />
            </div>
          </div>
          <FieldError msg={formError} variant="form" />
        </FormDrawer>

        <DataTable
          columns={columns}
          data={filteredStocks}
          showPagination
          itemsPerPage={10}
          emptyMessage={t('admin.stock.tableEmpty', 'No stock entries match your filters.')}
        />
      </PageShell>
    </CommercePageState>
  );
}
