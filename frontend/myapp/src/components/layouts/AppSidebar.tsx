import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { PanelLeftClose, PanelLeftOpen, X } from '@/components/icons/FluentIcons';
import { useSidebarLayout } from '@/components/layouts/sidebar-layout-context';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { NestingNav } from '@/components/ui/NestingNav';
import { menuData } from '@/common/MenuData';
import { useFilteredMenu } from '@/hooks/useFilteredMenu';
import { useT } from '@/hooks/use-t';
import { cn } from '@/libs/utils';

function SidebarPanel({
  collapsed,
  onCloseMobile,
  showCloseButton,
}: {
  collapsed: boolean;
  onCloseMobile?: () => void;
  showCloseButton?: boolean;
}) {
  const { t } = useT();
  const filteredMenuItems = useFilteredMenu(menuData.navMain);

  return (
    <>
      <div
        className={cn(
          'flex items-center border-b border-sidebar h-15',
          collapsed ? 'justify-center px-2 py-4' : 'justify-between px-4 py-4',
        )}
      >
        <BrandLogo
          collapsed={collapsed}
          variant="white"
        />
        {showCloseButton
          ? (
              <button
                type="button"
                onClick={onCloseMobile}
                className="rounded-md p-1 hover:bg-white/10 lg:hidden"
                aria-label={t('sidebar.close', 'Close menu')}
              >
                <X className="h-5 w-5" />
              </button>
            )
          : null}
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <NestingNav
          items={filteredMenuItems}
          collapsed={collapsed}
          onNavigate={onCloseMobile}
        />
      </div>
    </>
  );
}

export function AppSidebar() {
  const location = useLocation();
  const { t } = useT();
  const {
    collapsed,
    toggleCollapsed,
    mobileOpen,
    setMobileOpen,
    isMobile,
  } = useSidebarLayout();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, setMobileOpen]);

  const sidebarClasses = cn(
    'flex shrink-0 flex-col bg-sidebar text-white transition-all duration-200',
    collapsed ? 'w-16' : 'w-56',
  );

  if (isMobile) {
    return (
      <>
        {mobileOpen
          ? (
              <button
                type="button"
                className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                aria-label={t('sidebar.closeOverlay', 'Close menu overlay')}
                onClick={() => setMobileOpen(false)}
              />
            )
          : null}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex w-56 flex-col shadow-xl',
            'bg-sidebar text-white transition-transform duration-200 lg:hidden',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <SidebarPanel
            collapsed={false}
            showCloseButton
            onCloseMobile={() => setMobileOpen(false)}
          />
        </aside>
      </>
    );
  }

  return (
    <aside className={cn(sidebarClasses, 'min-h-screen')}>
      <SidebarPanel collapsed={collapsed} />
      <div
        className={cn(
          'border-t border-sidebar p-2',
          collapsed ? 'flex justify-center' : 'px-2',
        )}
      >
        <button
          type="button"
          onClick={toggleCollapsed}
          title={t(
            collapsed ? 'sidebar.expand' : 'sidebar.collapse',
            collapsed ? 'Expand sidebar' : 'Collapse sidebar',
          )}
          className={cn(
            'flex w-full items-center rounded-md py-2 text-sm',
            'hover:bg-white/10 transition-colors',
            collapsed ? 'justify-center px-2' : 'gap-3 px-3',
          )}
        >
          {collapsed
            ? (
                <PanelLeftOpen className="h-5 w-5 shrink-0" />
              )
            : (
                <>
                  <PanelLeftClose className="h-5 w-5 shrink-0" />
                  <span>
                    {t('sidebar.collapse', 'Collapse')}
                  </span>
                </>
              )}
        </button>
      </div>
    </aside>
  );
}
