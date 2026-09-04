import { Link } from 'react-router-dom';
import { useT } from '@/hooks/use-t';

import { AppConstants } from '@/common/AppConstants';
import Card from '@/components/ui/Card';
import { formatMoney } from '@/libs/format-money';
import { getProductStockTotal, isLowStock } from '@/libs/product-stock';
import type { Product } from '@/models';

type ProductCardProps = {
  product: Product;
};

export default function ProductCard({ product }: ProductCardProps) {
  const { t } = useT();
  const stock = getProductStockTotal(product);
  const lowStock = isLowStock(product);

  return (
    <Card className="flex h-full flex-col overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
          {product.category
            ? (
                <span className="shrink-0 rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                  {product.category.name}
                </span>
              )
            : null}
        </div>
        {product.description
          ? (
              <p className="text-sm text-gray-600 line-clamp-2 mb-3">{product.description}</p>
            )
          : null}
        <div className="mt-auto space-y-2">
          <p className="text-lg font-bold text-primary">{formatMoney(product.price)}</p>
          <p className="text-xs text-gray-500">
            {product.sku ? `${product.sku} · ` : ''}
            {product.unit}
            {' · '}
            {stock > 0
              ? (
                  <span className={lowStock ? 'text-amber-600 font-medium' : ''}>
                    {t('commerce.stockAvailable', '{count} in stock', { count: stock },)}
                  </span>
                )
              : (
                  <span className="text-red-600">
                    {t('commerce.outOfStock', 'Out of stock')}
                  </span>
                )}
          </p>
          <Link
            to={AppConstants.RouteBuilders.product(product.id)}
            className="inline-block text-sm font-medium text-primary hover:underline"
          >
            {t('commerce.viewProduct', 'View details')}
          </Link>
        </div>
      </div>
    </Card>
  );
}
