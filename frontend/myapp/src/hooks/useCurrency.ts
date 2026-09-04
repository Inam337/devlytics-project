import { useMemo, useState } from 'react';

import {
  getCurrency,
  formatCurrencyAmount,
  type FormatCurrencyOptions,
} from '@/utils/currency';

export interface UseCurrencyResult {
  /** Resolved currency (session → env → fallback) */
  currency: string;
  /** Always false (kept for API compatibility) */
  isCurrencyResolving: boolean;
  /** Format `amount` using the resolved currency */
  formatAmount: (amount: number, options?: FormatCurrencyOptions) => string;
}

/**
 * Currency hook for region-based (env) configuration.
 * Resolution order:
 * 1. sessionStorage (cached)
 * 2. environment variable
 * 3. DEFAULT_CURRENCY (AFN)
 *
 * No async logic → no useEffect required.
 */
export function useCurrency(): UseCurrencyResult {
  // Resolve once on initial render (no re-renders needed)
  const [currency] = useState(() => getCurrency());
  const formatAmount = useMemo(
    () => (amount: number, options?: FormatCurrencyOptions) =>
      formatCurrencyAmount(amount, currency, options),
    [currency],
  );

  return {
    currency,
    formatAmount,
    isCurrencyResolving: false,
  };
}
