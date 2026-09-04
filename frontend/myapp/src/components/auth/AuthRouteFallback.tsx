import { useT } from '@/hooks/use-t';

/** Shown while Zustand persist rehydrates auth state (avoids blank public/private routes). */
export default function AuthRouteFallback() {
  const { t } = useT();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-500">
        {t('common.text.loading', 'Loading...')}
      </p>
    </div>
  );
}
