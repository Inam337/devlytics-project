import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import { useT } from '@/hooks/use-t';
import { Menu } from '@/components/icons/FluentIcons';
import { AppConstants } from '@/common/AppConstants';
import { AppSidebar } from '@/components/layouts/AppSidebar';
import HeaderProfileDropdown from '@/components/layouts/HeaderProfileDropdown';
import LanguageSwitcher from '@/components/layouts/LanguageSwitcher';
import { SidebarLayoutProvider, useSidebarLayout } from '@/components/layouts/sidebar-layout-context';

interface MainLayoutProps {
  children: ReactNode;
  headerTitle?: string;
}

const routeTitleKeys: Record<string, string> = {
  [AppConstants.Routes.Private.Dashboard]: 'menu.dashboard',
  [AppConstants.Routes.Private.Profile]: 'menu.profile',
};

function resolveTitleKey(pathname: string): string | undefined {
  return routeTitleKeys[pathname];
}

function MainLayoutContent({
  children,
  headerTitle,
}: MainLayoutProps) {
  const location = useLocation();
  const { t } = useT();
  const { isMobile, setMobileOpen } = useSidebarLayout();
  const titleKey = resolveTitleKey(location.pathname);
  const pageTitle = headerTitle
    ?? (titleKey
      ? t(titleKey, titleKey)
      : t('app.title', 'Devlytics'));

  return (
    <div className="flex min-h-screen bg-page-gradient">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={[
            'sticky top-0 z-30 flex items-center justify-between gap-4 h-15',
            'border-b border-gray-200 bg-white px-2 py-2 sm:px-4',
          ].join(' ')}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3 ">
            {isMobile
              ? (
                  <button
                    type="button"
                    onClick={() => setMobileOpen(true)}
                    className="rounded-md border border-gray-200 p-2 hover:bg-gray-50"
                    aria-label={t('sidebar.open', 'Open menu')}
                  >
                    <Menu className="h-5 w-5 text-gray-700" />
                  </button>
                )
              : null}
            <h1 className="truncate text-lg font-semibold text-gray-900">{pageTitle}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LanguageSwitcher />
            <HeaderProfileDropdown />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function MainLayout(props: MainLayoutProps) {
  return (
    <SidebarLayoutProvider>
      <MainLayoutContent {...props} />
    </SidebarLayoutProvider>
  );
}
