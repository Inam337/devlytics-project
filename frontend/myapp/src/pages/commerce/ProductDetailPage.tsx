import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useT } from '@/hooks/use-t';

import { AppConstants } from '@/common/AppConstants';
import AppButton from '@/components/ui/AppButton';
import Card from '@/components/ui/Card';
import CommercePageState from '@/components/commerce/CommercePageState';
import FieldError from '@/components/ui/FieldError';
import { formatMoney } from '@/libs/format-money';
import { getProductStockTotal, isLowStock } from '@/libs/product-stock';
import type { Product } from '@/models';
import { getProduct } from '@/services/products';
import { useCartStore } from '@/stores/cart';

export default function ProductDetailPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const addProduct = useCartStore(state => state.addProduct);
  const cartLoading = useCartStore(state => state.isLoading);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);  const load = useCallback(async () => {
    if (!id) {
      setError('Invalid product');
      setLoading(false);

      return;
    }

    setLoading(true);
    setError(null);

    const result = await getProduct(id);

    if (!result.ok) {
      setError(result.error.message);
      setLoading(false);

      return;
    }

    setProduct(result.data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAddToCart = async () => {
    if (!product) {
      return;
    }

    setActionError(null);
    setAdded(false);

    const ok = await addProduct(product.id, quantity);

    if (!ok) {
      setActionError(useCartStore.getState().error);

      return;
    }

    setAdded(true);
  };

  const stock = product ? getProductStockTotal(product) : 0;

  return (
    <CommercePageState
      loading={loading}
      error={error}
      onRetry={load}
      empty={!loading && !error && !product}
    >
      {product
        ? (
            <div className="max-w-3xl">
              <Link
                to={AppConstants.Routes.Private.Products}
                className="text-sm text-primary hover:underline mb-4 inline-block"
              >
                {t('commerce.backToProducts', 'Back to products')}
              </Link>

              <Card className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900">{product.name}</h2>
                    {product.category
                      ? (
                          <p className="text-sm text-gray-500 mt-1">{product.category.name}</p>
                        )
                      : null}
                  </div>
                  <p className="text-2xl font-bold text-primary">{formatMoney(product.price)}</p>
                </div>

                {product.description
                  ? (
                      <p className="text-gray-700 mb-4">{product.description}</p>
                    )
                  : null}

                <dl className="grid grid-cols-2 gap-3 text-sm text-gray-600 mb-6">
                  <div>
                    <dt className="font-medium text-gray-900">SKU</dt>
                    <dd>{product.sku ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-900">
                      {t('commerce.unit', 'Unit')}
                    </dt>
                    <dd>{product.unit}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-900">
                      {t('commerce.type', 'Type')}
                    </dt>
                    <dd className="capitalize">{product.type}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-900">
                      {t('commerce.stock', 'Stock')}
                    </dt>
                    <dd className={isLowStock(product) ? 'text-amber-600 font-medium' : ''}>
                      {stock}
                    </dd>
                  </div>
                </dl>

                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <label
                      htmlFor="quantity"
                      className="text-sm font-medium block mb-1"
                    >
                      {t('commerce.quantity', 'Quantity')}
                    </label>
                    <input
                      id="quantity"
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={e => setQuantity(Math.max(1, Number.parseInt(e.target.value, 10) || 1))}
                      className="w-24 px-3 py-2 border rounded"
                    />
                  </div>
                  <AppButton
                    color="primary"
                    loading={cartLoading}
                    disabled={stock <= 0}
                    onClick={handleAddToCart}
                  >
                    {t('commerce.addToCart', 'Add to cart')}
                  </AppButton>
                  <AppButton
                    color="secondary"
                    onClick={() => navigate(AppConstants.Routes.Private.Cart)}
                  >
                    {t('commerce.goToCart', 'Go to cart')}
                  </AppButton>
                </div>

                <FieldError msg={actionError} />
                {added
                  ? (
                      <p
                        className="text-sm text-green-700 mt-3"
                        role="status"
                      >
                        {t('commerce.addedToCart', 'Added to your cart.')}
                      </p>
                    )
                  : null}
              </Card>
            </div>
          )
        : null}
    </CommercePageState>
  );
}
