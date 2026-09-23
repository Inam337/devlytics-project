import { useT } from '@/hooks/use-t';
import Card from '@/components/ui/Card';
import { useAuthStore } from '@/stores/auth';

/**
 * Placeholder authenticated landing page. Replace with the real Devlytics
 * dashboard (repo/org scores, goals, alerts) as those screens are built.
 */
export default function Dashboard() {
  const { t } = useT();
  const user = useAuthStore(state => state.user);

  return (
    <div className="max-w-2xl space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {t('pages.dashboard.title', 'Welcome to Devlytics')}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {t(
            'pages.dashboard.welcome',
            'This is a placeholder dashboard. Real screens will replace this once designed.',
          )}
        </p>
        {user
          ? (
              <p className="mt-4 text-sm text-gray-500">
                {t('pages.dashboard.signedInAs', 'Signed in as {name}', { name: user.fullName })}
              </p>
            )
          : null}
      </Card>
    </div>
  );
}
