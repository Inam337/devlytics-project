import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useT } from '@/hooks/use-t';

import { AppConstants } from '@/common/AppConstants';
import AppButton from '@/components/ui/AppButton';
import Card from '@/components/ui/Card';
import CommercePageState from '@/components/commerce/CommercePageState';
import FieldError from '@/components/ui/FieldError';
import { formatMoney } from '@/libs/format-money';
import { useCartStore } from '@/stores/cart';

export default function CartPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const cart = useCartStore(state => state.cart);
  const isLoading = useCartStore(state => state.isLoading);
  const error = useCartStore(state => state.error);
  const fetchCart = useCartStore(state => state.fetchCart);
  const updateQuantity = useCartStore(state => state.updateQuantity);
  const removeLine = useCartStore(state => state.removeLine);
  const clear = useCartStore(state => state.clear);
  const [lineError, setLineError] = useState<string | null>(null);

  useEffect(() => {
    void fetchCart();
  }, [fetchCart]);

  const items = cart?.items ?? [];
  const subtotal = items.reduce((sum, line) => {
    const price = Number.parseFloat(String(line.product.price));

    return sum + price * line.quantity;
  }, 0);  const handleUpdate = async (id: number, quantity: number) => {
    setLineError(null);

    const ok = await updateQuantity(id, quantity);

    if (!ok) {
      setLineError(useCartStore.getState().error);
    }
  };

  const handleRemove = async (id: number) => {
    setLineError(null);

    const ok = await removeLine(id);

    if (!ok) {
      setLineError(useCartStore.getState().error);
    }
  };

  const handleClear = async () => {
    setLineError(null);
    await clear();
  };

  return (
    <CommercePageState
      loading={isLoading && !cart}
      error={error}
      onRetry={fetchCart}
      empty={!isLoading && items.length === 0}
      emptyMessage={t('commerce.cart.empty', 'Your cart is empty. Browse products to get started.')}
    >
      {items.length > 0
        ? (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-3">
                {items.map(line => (
                  <Card
                    key={line.id}
                    className="p-4 flex flex-wrap items-center justify-between gap-4"
                  >
                    <div>
                      <h3 className="font-medium text-gray-900">{line.product.name}</h3>
                      <p className="text-sm text-gray-500">
                        {formatMoney(line.product.price)}
                        {' '}
                        {t('commerce.each', 'each')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(e) => {
                          const qty = Math.max(1, Number.parseInt(e.target.value, 10) || 1);

                          void handleUpdate(line.id, qty);
                        }}
                        className="w-20 px-2 py-1 border rounded text-sm"
                      />
                      <p className="font-semibold text-gray-900 min-w-[80px] text-right">
                        {formatMoney(Number.parseFloat(String(line.product.price)) * line.quantity)}
                      </p>
                      <AppButton
                        color="danger"
                        onClick={() => void handleRemove(line.id)}
                      >
                        {t('commerce.remove', 'Remove')}
                      </AppButton>
                    </div>
                  </Card>
                ))}
                <FieldError msg={lineError} />
              </div>

              <Card className="p-4 h-fit">
                <h3 className="font-semibold text-gray-900 mb-3">
                  {t('commerce.orderSummary', 'Order summary')}
                </h3>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">
                    {t('commerce.subtotal', 'Subtotal')}
                  </span>
                  <span className="font-medium">{formatMoney(subtotal)}</span>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  {t('commerce.pricesFromServer', 'Prices are loaded from the server when you checkout.')}
                </p>
                <div className="flex flex-col gap-2">
                  <AppButton
                    color="primary"
                    className="w-full"
                    onClick={() => navigate(AppConstants.Routes.Private.Checkout)}
                  >
                    {t('commerce.checkout', 'Checkout')}
                  </AppButton>
                  <AppButton
                    color="flat"
                    className="w-full"
                    onClick={() => void handleClear()}
                  >
                    {t('commerce.clearCart', 'Clear cart')}
                  </AppButton>
                  <Link
                    to={AppConstants.Routes.Private.Products}
                    className="text-center text-sm text-primary hover:underline"
                  >
                    {t('commerce.continueShopping', 'Continue shopping')}
                  </Link>
                </div>
              </Card>
            </div>
          )
        : (
            <Link
              to={AppConstants.Routes.Private.Products}
              className="text-primary hover:underline text-sm"
            >
              {t('commerce.browseProducts', 'Browse products')}
            </Link>
          )}
    </CommercePageState>
  );
}
