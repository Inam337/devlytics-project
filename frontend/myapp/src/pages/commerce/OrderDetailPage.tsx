import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useT } from '@/hooks/use-t';

import { AppConstants } from '@/common/AppConstants';
import AppButton from '@/components/ui/AppButton';
import Card from '@/components/ui/Card';
import CommercePageState from '@/components/commerce/CommercePageState';
import StatusBadge from '@/components/commerce/StatusBadge';
import FieldError from '@/components/ui/FieldError';
import { formatMoney } from '@/libs/format-money';
import { OrderStatus, PaymentMethod, PaymentStatus, type Order, type Payment } from '@/models';
import { getOrder } from '@/services/orders';
import { createPayment, listPayments } from '@/services/payments';

const PAYMENT_METHODS = [
  PaymentMethod.COD,
  PaymentMethod.STRIPE,
  PaymentMethod.JAZZCASH,
  PaymentMethod.EASYPAISA,
] as const;

export default function OrderDetailPage() {
  const { t } = useT();
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.COD);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!id) {
      setError('Invalid order');
      setLoading(false);

      return;
    }

    setLoading(true);
    setError(null);

    const [orderResult, paymentsResult] = await Promise.all([
      getOrder(id),
      listPayments(),
    ]);

    if (!orderResult.ok) {
      setError(orderResult.error.message);
      setLoading(false);

      return;
    }

    setOrder(orderResult.data);

    if (paymentsResult.ok) {
      setPayments(paymentsResult.data.filter(p => p.order?.id === orderResult.data.id));
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePay = async () => {
    if (!order) {
      return;
    }

    setPaying(true);
    setPayError(null);
    setPaySuccess(null);

    const result = await createPayment({ orderId: order.id, method });

    if (!result.ok) {
      setPayError(result.error.message);
      setPaying(false);

      return;
    }

    setPaySuccess(
      t('commerce.paymentCreated', 'Payment created. Status: {status}', { status: result.data.status }),
    );
    setPaying(false);
    await load();
  };

  const latestPayment = payments[0];

  return (
    <CommercePageState
      loading={loading}
      error={error}
      onRetry={load}
      empty={!loading && !error && !order}
    >
      {order
        ? (
            <div className="max-w-3xl space-y-4">
              <Link
                to={AppConstants.Routes.Private.Orders}
                className="text-sm text-primary hover:underline inline-block"
              >
                {t('commerce.backToOrders', 'Back to orders')}
              </Link>

              <Card className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {t('commerce.orderNumber', 'Order #{id}', { id: order.id },)}
                  </h2>
                  <div className="flex gap-2">
                    <StatusBadge
                      label={order.status}
                      tone={
                        order.status === OrderStatus.CONFIRMED
                          ? 'success'
                          : order.status === OrderStatus.CANCELLED
                            ? 'danger'
                            : 'warning'
                      }
                    />
                    {order.isPaid
                      ? (
                          <StatusBadge
                            label={t('commerce.paid', 'Paid')}
                            tone="success"
                          />
                        )
                      : null}
                  </div>
                </div>

                <p className="text-lg font-bold text-primary mb-4">
                  {formatMoney(order.totalAmount)}
                </p>

                <h3 className="font-medium text-gray-900 mb-2">
                  {t('commerce.lineItems', 'Items')}
                </h3>
                <ul className="divide-y divide-gray-100 mb-6">
                  {order.items?.map(item => (
                    <li
                      key={item.id}
                      className="flex justify-between py-2 text-sm"
                    >
                      <span>
                        {item.product?.name
                          ?? t('commerce.product', 'Product')}
                        {' × '}
                        {item.quantity}
                      </span>
                      <span className="font-medium">
                        {formatMoney(Number.parseFloat(String(item.price)) * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>

                <section className="border-t border-gray-200 pt-4">
                  <h3 className="font-medium text-gray-900 mb-3">
                    {t('commerce.payment', 'Payment')}
                  </h3>

                  {latestPayment
                    ? (
                        <div className="rounded-md bg-gray-50 p-3 text-sm mb-4">
                          <p>
                            {t('commerce.method', 'Method')}
                            {': '}
                            <span className="uppercase">{latestPayment.method}</span>
                          </p>
                          <p>
                            {t('commerce.status', 'Status')}
                            {': '}
                            <span className="capitalize">{latestPayment.status}</span>
                          </p>
                          <p>
                            {t('commerce.amount', 'Amount')}
                            {': '}
                            {formatMoney(latestPayment.amount)}
                          </p>
                        </div>
                      )
                    : null}

                  {!order.isPaid && latestPayment?.status !== PaymentStatus.SUCCESS
                    ? (
                        <div className="space-y-3">
                          <label
                            htmlFor="payment-method"
                            className="text-sm font-medium block"
                          >
                            {t('commerce.selectPaymentMethod', 'Payment method')}
                          </label>
                          <select
                            id="payment-method"
                            value={method}
                            onChange={e => setMethod(e.target.value as PaymentMethod)}
                            className="w-full max-w-xs px-3 py-2 border rounded"
                          >
                            {PAYMENT_METHODS.map(value => (
                              <option
                                key={value}
                                value={value}
                              >
                                {value.toUpperCase()}
                              </option>
                            ))}
                          </select>
                          <AppButton
                            color="primary"
                            loading={paying}
                            onClick={() => void handlePay()}
                          >
                            {t('commerce.payNow', 'Pay now')}
                          </AppButton>
                        </div>
                      )
                    : null}

                  <FieldError msg={payError} />
                  {paySuccess
                    ? (
                        <p
                          className="text-sm text-green-700 mt-2"
                          role="status"
                        >
                          {paySuccess}
                        </p>
                      )
                    : null}
                </section>
              </Card>
            </div>
          )
        : null}
    </CommercePageState>
  );
}
