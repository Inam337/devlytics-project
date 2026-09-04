import { useCallback, useEffect, useMemo, useState } from 'react';
import { useT } from '@/hooks/use-t';
import { useSearchParams } from 'react-router-dom';

import CommercePageState from '@/components/commerce/CommercePageState';
import ProductCard from '@/components/commerce/ProductCard';
import { listCategories } from '@/services/categories';
import { listProducts } from '@/services/products';
import type { Category, Product } from '@/models';
import { cn } from '@/libs/utils';

export default function ProductsPage() {
  const { t } = useT();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);  const categoryId = searchParams.get('categoryId');  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [productsResult, categoriesResult] = await Promise.all([
      listProducts(),
      listCategories(),
    ]);

    if (!productsResult.ok) {
      setError(productsResult.error.message);
      setLoading(false);

      return;
    }

    setProducts(productsResult.data);

    if (categoriesResult.ok) {
      setCategories(categoriesResult.data);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredProducts = useMemo(() => {
    if (!categoryId) {
      return products;
    }

    const id = Number.parseInt(categoryId, 10);

    return products.filter(product => product.category?.id === id);
  }, [categoryId, products]);  const setCategoryFilter = (id: number | null) => {
    if (id == null) {
      setSearchParams({});
    } else {
      setSearchParams({ categoryId: String(id) });
    }
  };

  return (
    <CommercePageState
      loading={loading}
      error={error}
      onRetry={load}
      empty={!loading && !error && filteredProducts.length === 0}
      emptyMessage={t('commerce.products.empty', 'No products found.')}
    >
      <div className="space-y-6">
        {categories.length > 0
          ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCategoryFilter(null)}
                  className={cn(
                    'rounded-full px-3 py-1 text-sm border transition-colors',
                    !categoryId
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
                  )}
                >
                  {t('commerce.allCategories', 'All')}
                </button>
                {categories.map(category => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setCategoryFilter(category.id)}
                    className={cn(
                      'rounded-full px-3 py-1 text-sm border transition-colors',
                      categoryId === String(category.id)
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
                    )}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            )
          : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
            />
          ))}
        </div>
      </div>
    </CommercePageState>
  );
}
