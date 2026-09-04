import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useT } from '@/hooks/use-t';

import { AppConstants } from '@/common/AppConstants';
import AppButton from '@/components/ui/AppButton';
import Card from '@/components/ui/Card';
import CommercePageState from '@/components/commerce/CommercePageState';
import FieldError from '@/components/ui/FieldError';
import { formatMoney } from '@/libs/format-money';
import { checkout } from '@/services/orders';
import { useCartStore } from '@/stores/cart';

export default function CheckoutPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const cart = useCartStore(state => state.cart);
  const fetchCart = useCartStore(state => state.fetchCart);
  const isLoading = useCartStore(state => state.isLoading);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchCart();
  }, [fetchCart]);

  const items = cart?.items ?? [];
  const subtotal = items.reduce((sum, line) => {
    const price = Number.parseFloat(String(line.product.price));

    return sum + price * line.quantity;
  }, 0);  const handleCheckout = async () => {
    setSubmitting(true);
    setError(null);

    const result = await checkout();

    if (!result.ok) {
      setError(result.error.message);
      setSubmitting(false);

      return;
    }

    await fetchCart();
    navigate(AppConstants.RouteBuilders.order(result.data.id), { replace: true });
  };

  return (
    <CommercePageState
      loading={isLoading && !cart}
      empty={!isLoading && items.length === 0}
      emptyMessage={t('commerce.checkout.emptyCart', 'Add items to your cart before checkout.')}
    >
      {items.length > 0
        ? (
            <div className="max-w-2xl space-y-4">
              <Card className="p-4">
                <h2 className="font-semibold text-gray-900 mb-3">
                  {t('commerce.reviewOrder', 'Review your order')}
                </h2>
                <ul className="divide-y divide-gray-100">
                  {items.map(line => (
                    <li
                      key={line.id}
                      className="flex justify-between py-2 text-sm"
                    >
                      <span>
                        {line.product.name}
                        {' × '}
                        {line.quantity}
                      </span>
                      <span className="font-medium">
                        {formatMoney(Number.parseFloat(String(line.product.price)) * line.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between border-t border-gray-200 mt-3 pt-3 font-semibold">
                  <span>
                    {t('commerce.estimatedTotal', 'Estimated total')}
                  </span>
                  <span>{formatMoney(subtotal)}</span>
                </div>
              </Card>

              <FieldError msg={error} variant="form" />

              <div className="flex flex-wrap gap-3">
                <AppButton
                  color="primary"
                  loading={submitting}
                  onClick={() => void handleCheckout()}
                >
                  {t('commerce.placeOrder', 'Place order')}
                </AppButton>
                <Link
                  to={AppConstants.Routes.Private.Cart}
                  className="text-sm text-primary hover:underline self-center"
                >
                  {t('commerce.backToCart', 'Back to cart')}
                </Link>
              </div>
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
