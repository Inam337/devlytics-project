import type { ReactNode } from 'react';
import { useT } from '@/hooks/use-t';

import AppButton from '@/components/ui/AppButton';

type CommercePageStateProps = {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  onRetry?: () => void;
  children: ReactNode;
};

export default function CommercePageState({
  loading,
  error,
  empty,
  emptyMessage,
  onRetry,
  children,
}: CommercePageStateProps) {
  const { t } = useT();

  if (loading) {
    return (
      <p className="text-sm text-gray-500 py-8 text-center">
        {t('commerce.loading', 'Loading...')}
      </p>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center">
        <p className="text-sm text-red-700 mb-3">{error}</p>
        {onRetry
          ? (
              <AppButton
                color="danger"
                onClick={onRetry}
              >
                {t('commerce.retry', 'Try again')}
              </AppButton>
            )
          : null}
      </div>
    );
  }

  if (empty) {
    return (
      <p className="text-sm text-gray-500 py-8 text-center">
        {emptyMessage
          ?? t('commerce.empty', 'Nothing to show yet.')}
      </p>
    );
  }

  return <>{children}</>;
}
