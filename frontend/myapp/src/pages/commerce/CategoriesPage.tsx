import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '@/hooks/use-t';

import { AppConstants } from '@/common/AppConstants';
import Card from '@/components/ui/Card';
import CommercePageState from '@/components/commerce/CommercePageState';
import type { Category } from '@/models';
import { listCategories } from '@/services/categories';

export default function CategoriesPage() {
  const { t } = useT();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await listCategories();

    if (!result.ok) {
      setError(result.error.message);
      setLoading(false);

      return;
    }

    setCategories(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <CommercePageState
      loading={loading}
      error={error}
      onRetry={load}
      empty={!loading && !error && categories.length === 0}
      emptyMessage={t('commerce.categories.empty', 'No categories yet.')}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map(category => (
          <Card
            key={category.id}
            className="p-4 hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-gray-900">{category.name}</h3>
            {category.description
              ? (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{category.description}</p>
                )
              : null}
            <p className="text-xs text-gray-500 mt-2">
              {t('commerce.categoryProductCount', '{count} products', { count: category.products?.length ?? 0 },)}
            </p>
            <Link
              to={`${AppConstants.Routes.Private.Products}?categoryId=${category.id}`}
              className="inline-block mt-3 text-sm font-medium text-primary hover:underline"
            >
              {t('commerce.browseCategory', 'Browse products')}
            </Link>
          </Card>
        ))}
      </div>
    </CommercePageState>
  );
}
