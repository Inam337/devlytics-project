import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useT } from '@/hooks/use-t';

import AdminFilterField, { adminFilterSelectClass } from '@/components/admin/AdminFilterField';
import InventoryLineItemsForm, {
  type InventoryLineItemRow,
} from '@/components/admin/InventoryLineItemsForm';
import { useAdminFormDrawer } from '@/components/admin/useAdminFormDrawer';
import { matchesSearchQuery, useAdminTableFilters } from '@/components/admin/useAdminTableFilters';
import { adminInputClass, adminLabelClass } from '@/components/admin/admin-form-styles';
import CommercePageState from '@/components/commerce/CommercePageState';
import { DataTable } from '@/components/ui/DataTable';
import FieldError from '@/components/ui/FieldError';
import FormDrawer from '@/components/ui/FormDrawer';
import PageShell from '@/components/ui/PageShell';
import PageToolbar from '@/components/ui/PageToolbar';
import { actionColumn, dateColumn } from '@/components/ui/data-table-columns';
import { formatMoney } from '@/libs/format-money';
import type { Product, Purchase, Supplier } from '@/models';
import { listProducts } from '@/services/products';
import { createPurchase, deletePurchase, listPurchases } from '@/services/purchases';
import { listSuppliers } from '@/services/suppliers';

function buildDefaultLines(products: Product[]): InventoryLineItemRow[] {
  if (products.length === 0) {
    return [];
  }

  const first = products[0];

  return [{
    productId: first.id,
    quantity: 1,
    unitPrice: Number.parseFloat(String(first.price)),
  }];
}

export default function AdminPurchasesPage() {
  const { t } = useT();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState('');
  const [lines, setLines] = useState<InventoryLineItemRow[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filters = useAdminTableFilters({
    initialFilters: { supplier: '' },
  });

  const resetFormFields = useCallback(() => {
    setFormError(null);
    setLines(buildDefaultLines(products));
    setSupplierId(String(suppliers[0]?.id ?? ''));
  }, [products, suppliers]);

  const drawer = useAdminFormDrawer({ onReset: resetFormFields });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [purchasesResult, suppliersResult, productsResult] = await Promise.all([
      listPurchases(),
      listSuppliers(),
      listProducts(),
    ]);

    if (!purchasesResult.ok) {
      setError(purchasesResult.error.message);
      setLoading(false);

      return;
    }

    setPurchases(purchasesResult.data);

    if (suppliersResult.ok) {
      setSuppliers(suppliersResult.data);
      setSupplierId(prev => prev || String(suppliersResult.data[0]?.id ?? ''));
    }

    if (productsResult.ok) {
      setProducts(productsResult.data);
      setLines(prev => (prev.length > 0 ? prev : buildDefaultLines(productsResult.data)));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async () => {
    const parsedSupplierId = Number.parseInt(supplierId, 10);

    if (!parsedSupplierId || lines.length === 0) {
      setFormError(t('admin.purchaseFormRequired', 'Supplier and at least one line item are required'));

      return;
    }

    setSubmitting(true);
    setFormError(null);

    const result = await createPurchase({
      supplierId: parsedSupplierId,
      items: lines,
    });

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

    const result = await deletePurchase(id);

    if (!result.ok) {
      setError(result.error.message);

      return;
    }

    await load();
  }, [load, t]);

  const filteredPurchases = useMemo(() => purchases.filter((purchase) => {
    if (!matchesSearchQuery(filters.draftSearch, [purchase.id, purchase.supplier?.name])) {
      return false;
    }

    if (filters.appliedFilters.supplier
      && String(purchase.supplier?.id ?? '') !== filters.appliedFilters.supplier) {
      return false;
    }

    return true;
  }), [purchases, filters.draftSearch, filters.appliedFilters]);

  const columns = useMemo<ColumnDef<Purchase>[]>(() => [
    {
      accessorKey: 'id',
      header: t('admin.purchaseNumberHeader', 'Purchase #'),
      enableSorting: true,
      cell: ({ row }) => (
        <span className="font-medium text-gray-900">
          {t('admin.purchaseNumber', 'Purchase #{id}', { id: row.original.id })}
        </span>
      ),
    },
    {
      id: 'supplier',
      accessorFn: row => row.supplier?.name ?? '',
      header: t('admin.supplier', 'Supplier'),
      enableSorting: true,
      cell: ({ row }) => (
        <span className="text-gray-700">
          {row.original.supplier?.name ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'totalAmount',
      header: t('common.total', 'Total'),
      enableSorting: true,
      cell: ({ row }) => formatMoney(row.original.totalAmount),
    },
    {
      id: 'itemCount',
      accessorFn: row => row.items?.length ?? 0,
      header: t('admin.lineItems', 'Line items'),
      enableSorting: true,
      cell: ({ row }) => (
        <span className="text-gray-500">
          {row.original.items?.length ?? 0}
        </span>
      ),
    },
    dateColumn<Purchase>(
      row => row.purchasedAt,
      {
        id: 'purchasedAt',
        header: t('common.date', 'Date'),
        enableSorting: true,
      },
    ),
    actionColumn<Purchase>({
      onDelete: purchase => void handleDelete(purchase.id),
      deleteLabel: t('admin.delete', 'Delete'),
    }),
  ], [t, handleDelete]);

  return (
    <CommercePageState
      loading={loading}
      error={error}
      onRetry={load}
      empty={!loading && !error && purchases.length === 0 && !drawer.open}
      emptyMessage={t('admin.purchases.empty', 'No purchases recorded yet.')}
    >
      <PageShell
        maxWidth="full"
        hint={t('admin.purchases.hint', 'Create purchases with nested items; totals are computed server-side.')}
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
                label={t('admin.supplier', 'Supplier')}
                htmlFor="filter-supplier"
              >
                <select
                  id="filter-supplier"
                  value={filters.draftFilters.supplier}
                  onChange={e => filters.setDraftFilter('supplier', e.target.value)}
                  className={adminFilterSelectClass()}
                >
                  <option value="">{t('filters.all', 'All')}</option>
                  {suppliers.map(supplier => (
                    <option
                      key={supplier.id}
                      value={supplier.id}
                    >
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </AdminFilterField>
            )}
            primaryLabel={t('admin.addPurchase', 'Record purchase')}
            onPrimaryClick={drawer.openCreate}
            primaryHidden={drawer.open || suppliers.length === 0 || products.length === 0}
          />
        )}
      >
        <FormDrawer
          open={drawer.open}
          onOpenChange={drawer.handleOpenChange}
          title={t('admin.newPurchase', 'New purchase')}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitLabel={t('admin.save', 'Save')}
          cancelLabel={t('admin.cancel', 'Cancel')}
          size="lg"
        >
          <div>
            <label className={adminLabelClass}>
              {t('admin.supplier', 'Supplier')}
            </label>
            <select
              value={supplierId}
              onChange={e => setSupplierId(e.target.value)}
              className={adminInputClass}
            >
              {suppliers.map(supplier => (
                <option
                  key={supplier.id}
                  value={supplier.id}
                >
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>
          <InventoryLineItemsForm
            items={lines}
            products={products}
            onChange={setLines}
          />
          <FieldError msg={formError} variant="form" />
        </FormDrawer>

        <DataTable
          columns={columns}
          data={filteredPurchases}
          showPagination
          itemsPerPage={10}
          emptyMessage={t('admin.purchases.tableEmpty', 'No purchases match your filters.')}
        />
      </PageShell>
    </CommercePageState>
  );
}
