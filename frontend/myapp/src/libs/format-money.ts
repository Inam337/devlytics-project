import type { DecimalAmount } from '@/models';

export function formatMoney(amount: DecimalAmount, currency = 'PKR'): string {
  const value = typeof amount === 'string' ? Number.parseFloat(amount) : amount;

  if (Number.isNaN(value)) {
    return String(amount);
  }

  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}
