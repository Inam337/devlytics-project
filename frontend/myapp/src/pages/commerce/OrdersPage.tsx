import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '@/hooks/use-t';

import { AppConstants } from '@/common/AppConstants';
import Card from '@/components/ui/Card';
import CommercePageState from '@/components/commerce/CommercePageState';
import StatusBadge from '@/components/commerce/StatusBadge';
import { formatMoney } from '@/libs/format-money';
import { OrderStatus } from '@/models';
import type { Order } from '@/models';
import { listOrders } from '@/services/orders';

function orderStatusTone(status: string): 'warning' | 'success' | 'danger' | 'neutral' {
  if (status === OrderStatus.CONFIRMED) {
    return 'success';
  }

  if (status === OrderStatus.CANCELLED) {
    return 'danger';
  }

  if (status === OrderStatus.PENDING) {
    return 'warning';
  }

  return 'neutral';
}

export default function OrdersPage() {
  const { t } = useT();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await listOrders();

    if (!result.ok) {
      setError(result.error.message);
      setLoading(false);

      return;
    }

    setOrders(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <CommercePageState
      loading={loading}
      error={error}
      onRetry={load}
      empty={!loading && !error && orders.length === 0}
      emptyMessage={t('commerce.orders.empty', 'No orders yet. Checkout from your cart to create one.')}
    >
      <div className="space-y-3">
        {orders.map(order => (
          <Card
            key={order.id}
            className="p-4 flex flex-wrap items-center justify-between gap-3"
          >
            <div>
              <p className="font-medium text-gray-900">
                {t('commerce.orderNumber', 'Order #{id}', { id: order.id },)}
              </p>
              <p className="text-sm text-gray-500">
                {order.items?.length ?? 0}
                {' '}
                {t('commerce.items', 'items')}
                {' · '}
                {formatMoney(order.totalAmount)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge
                label={order.status}
                tone={orderStatusTone(order.status)}
              />
              {order.isPaid
                ? (
                    <StatusBadge
                      label={t('commerce.paid', 'Paid')}
                      tone="success"
                    />
                  )
                : null}
              <Link
                to={AppConstants.RouteBuilders.order(order.id)}
                className="text-sm font-medium text-primary hover:underline"
              >
                {t('commerce.viewOrder', 'View')}
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </CommercePageState>
  );
}
