import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useT } from '@/hooks/use-t';
import { Menu } from '@/components/icons/FluentIcons';

import { AppConstants } from '@/common/AppConstants';
import { AppSidebar } from '@/components/layouts/AppSidebar';
import HeaderCartLink from '@/components/layouts/HeaderCartLink';
import HeaderProfileDropdown from '@/components/layouts/HeaderProfileDropdown';
import LanguageSwitcher from '@/components/layouts/LanguageSwitcher';
import { SidebarLayoutProvider, useSidebarLayout } from '@/components/layouts/sidebar-layout-context';
import { useCartStore } from '@/stores/cart';

interface MainLayoutProps {
  children: ReactNode;
  headerTitle?: string;
}

const routeTitleKeys: Record<string, string> = {
  [AppConstants.Routes.Private.Dashboard]: 'menu.dashboard',
  [AppConstants.Routes.Private.Profile]: 'menu.profile',
  [AppConstants.Routes.Private.Products]: 'menu.products',
  [AppConstants.Routes.Private.Categories]: 'menu.categories',
  [AppConstants.Routes.Private.Cart]: 'menu.cart',
  [AppConstants.Routes.Private.Checkout]: 'menu.checkout',
  [AppConstants.Routes.Private.Orders]: 'menu.ordersList',
  [AppConstants.Routes.Private.Admin.Categories]: 'menu.adminCategories',
  [AppConstants.Routes.Private.Admin.Products]: 'menu.adminProducts',
  [AppConstants.Routes.Private.Admin.Suppliers]: 'menu.adminSuppliers',
  [AppConstants.Routes.Private.Admin.Stock]: 'menu.adminStock',
  [AppConstants.Routes.Private.Admin.Purchases]: 'menu.adminPurchases',
  [AppConstants.Routes.Private.Admin.Sales]: 'menu.adminSales',
  [AppConstants.Routes.Private.Admin.Customers]: 'menu.adminCustomers',
  [AppConstants.Routes.Private.Admin.Users]: 'menu.adminUsers',
};

function resolveTitleKey(pathname: string): string | undefined {
  const exact = routeTitleKeys[pathname];

  if (exact) {
    return exact;
  }

  if (pathname.startsWith(`${AppConstants.Routes.Private.Products}/`)) {
    return 'commerce.productDetail';
  }

  if (pathname.startsWith(`${AppConstants.Routes.Private.Orders}/`)) {
    return 'commerce.orderDetail';
  }

  return undefined;
}

function MainLayoutContent({
  children,
  headerTitle,
}: MainLayoutProps) {
  const location = useLocation();
  const { t } = useT();
  const fetchCart = useCartStore(state => state.fetchCart);
  const { isMobile, setMobileOpen } = useSidebarLayout();
  const titleKey = resolveTitleKey(location.pathname);

  useEffect(() => {
    void fetchCart();
  }, [fetchCart]);

  const pageTitle = headerTitle
    ?? (titleKey
      ? t(titleKey, titleKey)
      : t('app.title', 'Zentro'));

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
            <HeaderCartLink />
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
