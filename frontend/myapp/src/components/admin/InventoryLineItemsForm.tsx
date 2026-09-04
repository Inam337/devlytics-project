import { useT } from '@/hooks/use-t';

import AppButton from '@/components/ui/AppButton';
import type { Product } from '@/models';

import { adminInputClass, adminLabelClass } from './admin-form-styles';

export interface InventoryLineItemRow {
  productId: number;
  quantity: number;
  unitPrice: number;
}

interface InventoryLineItemsFormProps {
  items: InventoryLineItemRow[];
  products: Product[];
  onChange: (items: InventoryLineItemRow[]) => void;
}

const emptyRow = (products: Product[]): InventoryLineItemRow => ({
  productId: products[0]?.id ?? 0,
  quantity: 1,
  unitPrice: Number.parseFloat(String(products[0]?.price ?? 0)),
});

export default function InventoryLineItemsForm({
  items,
  products,
  onChange,
}: InventoryLineItemsFormProps) {
  const { t } = useT();  const updateRow = (index: number, patch: Partial<InventoryLineItemRow>) => {
    onChange(items.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const handleProductChange = (index: number, productId: number) => {
    const product = products.find(p => p.id === productId);
    const price = Number.parseFloat(String(product?.price ?? 0));

    updateRow(index, { productId, unitPrice: price });
  };

  const addRow = () => {
    if (products.length === 0) {
      return;
    }

    onChange([...items, emptyRow(products)]);
  };

  const removeRow = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  if (products.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        {t('admin.noProductsForLines', 'Add products to the catalog before creating line items.')}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className={adminLabelClass}>
          {t('admin.lineItems', 'Line items')}
        </p>
        <AppButton
          color="flat"
          onClick={addRow}
        >
          {t('admin.addLine', 'Add line')}
        </AppButton>
      </div>

      {items.map((row, index) => (
        <div
          key={index}
          className="grid gap-3 rounded-md border border-gray-200 p-3 sm:grid-cols-4"
        >
          <div className="sm:col-span-2">
            <label className={adminLabelClass}>
              {t('admin.product', 'Product')}
            </label>
            <select
              value={row.productId}
              onChange={e => handleProductChange(index, Number.parseInt(e.target.value, 10))}
              className={adminInputClass}
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
              min={1}
              value={row.quantity}
              onChange={e => updateRow(index, {
                quantity: Math.max(1, Number.parseInt(e.target.value, 10) || 1),
              })}
              className={adminInputClass}
            />
          </div>
          <div>
            <label className={adminLabelClass}>
              {t('admin.unitPrice', 'Unit price')}
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={row.unitPrice}
              onChange={e => updateRow(index, {
                unitPrice: Number.parseFloat(e.target.value) || 0,
              })}
              className={adminInputClass}
            />
          </div>
          {items.length > 1
            ? (
                <div className="sm:col-span-4">
                  <AppButton
                    color="danger"
                    onClick={() => removeRow(index)}
                  >
                    {t('admin.removeLine', 'Remove line')}
                  </AppButton>
                </div>
              )
            : null}
        </div>
      ))}
    </div>
  );
}
