import { Link } from 'react-router-dom';
import { useT } from '@/hooks/use-t';
import {
  ArrowRight,
  ClipboardList,
  Package,
  Settings,
  ShoppingCart,
  Warehouse,
} from '@/components/icons/FluentIcons';

import { AppConstants } from '@/common/AppConstants';
import Card from '@/components/ui/Card';
import { useIsAdmin } from '@/hooks/useIsAdmin';

const quickLinks = [
  {
    titleKey: 'menu.products',
    descriptionKey: 'commerce.dashboard.productsHint',
    to: AppConstants.Routes.Private.Products,
    icon: Package,
  },
  {
    titleKey: 'menu.cart',
    descriptionKey: 'commerce.dashboard.cartHint',
    to: AppConstants.Routes.Private.Cart,
    icon: ShoppingCart,
  },
  {
    titleKey: 'menu.ordersList',
    descriptionKey: 'commerce.dashboard.ordersHint',
    to: AppConstants.Routes.Private.Orders,
    icon: ClipboardList,
  },
] as const;
const adminLinks = [
  {
    titleKey: 'menu.adminProducts',
    descriptionKey: 'admin.dashboard.productsHint',
    to: AppConstants.Routes.Private.Admin.Products,
    icon: Settings,
  },
  {
    titleKey: 'menu.adminStock',
    descriptionKey: 'admin.dashboard.stockHint',
    to: AppConstants.Routes.Private.Admin.Stock,
    icon: Warehouse,
  },
  {
    titleKey: 'menu.adminPurchases',
    descriptionKey: 'admin.dashboard.purchasesHint',
    to: AppConstants.Routes.Private.Admin.Purchases,
    icon: ClipboardList,
  },
] as const;

export default function Dashboard() {
  const { t } = useT();
  const isAdmin = useIsAdmin();

  return (
    <div className="max-w-4xl space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {t('commerce.dashboard.welcome', 'Welcome to Zentro Shop')}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {t('pages.dashboard.welcome', 'Welcome back. Use the sidebar to navigate.')}
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((link) => {
          const Icon = link.icon;

          return (
            <Link
              key={link.to}
              to={link.to}
              className="group"
            >
              <Card className="h-full p-5 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-lg bg-primary/10 p-2">
                    <Icon className="h-5 w-5 text-primary" />
                  </span>
                  <ArrowRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5" />
                </div>
                <h3 className="mt-3 font-semibold text-gray-900">
                  {t(link.titleKey, link.titleKey)}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {t(link.descriptionKey, link.descriptionKey)}
                </p>
              </Card>
            </Link>
          );
        })}
      </div>

      {isAdmin
        ? (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">
                {t('admin.dashboard.title', 'Admin tools')}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {adminLinks.map((link) => {
                  const Icon = link.icon;

                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="group"
                    >
                      <Card className="h-full p-5 transition-shadow hover:shadow-md border-primary/20">
                        <div className="flex items-start justify-between gap-3">
                          <span className="rounded-lg bg-primary/10 p-2">
                            <Icon className="h-5 w-5 text-primary" />
                          </span>
                          <ArrowRight
                            className={[
                              'h-4 w-4 text-gray-400 transition-transform',
                              'group-hover:translate-x-0.5',
                            ].join(' ')}
                          />
                        </div>
                        <h3 className="mt-3 font-semibold text-gray-900">
                          {t(link.titleKey, link.titleKey)}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {t(link.descriptionKey, link.descriptionKey)}
                        </p>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          )
        : null}
    </div>
  );
}
