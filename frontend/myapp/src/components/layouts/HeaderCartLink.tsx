import { Link } from 'react-router-dom';
import { useT } from '@/hooks/use-t';
import { ShoppingCart } from '@/components/icons/FluentIcons';

import { AppConstants } from '@/common/AppConstants';
import { useCartStore } from '@/stores/cart';

export default function HeaderCartLink() {
  const { t } = useT();
  const itemCount = useCartStore(state => state.itemCount);

  return (
    <Link
      to={AppConstants.Routes.Private.Cart}
      className="relative flex items-center gap-1 rounded-md border border-gray-200 px-3 py-2 hover:bg-gray-50"
      aria-label={t('commerce.cart', 'Cart')}
    >
      <ShoppingCart className="h-5 w-5 text-gray-700" />
      <span className="hidden text-sm text-gray-700 sm:inline">
        {t('commerce.cart', 'Cart')}
      </span>
      {itemCount > 0
        ? (
            <span
              className={[
                'absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center',
                'rounded-full bg-primary px-1 text-xs font-semibold text-white',
              ].join(' ')}
            >
              {itemCount > 99 ? '99+' : itemCount}
            </span>
          )
        : null}
    </Link>
  );
}
