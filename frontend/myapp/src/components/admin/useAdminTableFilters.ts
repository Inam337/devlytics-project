import { useCallback, useState } from 'react';

export type AdminFilterValues = Record<string, string>;

type UseAdminTableFiltersOptions = {
  initialFilters?: AdminFilterValues;
  liveSearch?: boolean;
};

export function useAdminTableFilters(options: UseAdminTableFiltersOptions = {}) {
  const initial = options.initialFilters ?? {};
  const liveSearch = options.liveSearch ?? false;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftSearch, setDraftSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [draftFilters, setDraftFilters] = useState<AdminFilterValues>({ ...initial });
  const [appliedFilters, setAppliedFilters] = useState<AdminFilterValues>({ ...initial });

  const setDraftFilter = useCallback((key: string, value: string) => {
    setDraftFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSetDraftSearch = useCallback((value: string) => {
    setDraftSearch(value);

    if (liveSearch) {
      setAppliedSearch(value);
    }
  }, [liveSearch]);

  const applyFilters = useCallback(() => {
    if (!liveSearch) {
      setAppliedSearch(draftSearch);
    }

    setAppliedFilters({ ...draftFilters });
    setFiltersOpen(false);
  }, [draftFilters, draftSearch, liveSearch]);

  const clearFilters = useCallback(() => {
    setDraftSearch('');
    setAppliedSearch('');
    setDraftFilters({ ...initial });
    setAppliedFilters({ ...initial });
  }, [initial]);

  return {
    filtersOpen,
    setFiltersOpen,
    draftSearch,
    setDraftSearch: handleSetDraftSearch,
    appliedSearch,
    draftFilters,
    appliedFilters,
    setDraftFilter,
    applyFilters,
    clearFilters,
  };
}

export function matchesSearchQuery(
  query: string,
  values: Array<string | number | null | undefined>,
): boolean {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return values.some((value) => {
    if (value == null) {
      return false;
    }

    return String(value).toLowerCase().includes(normalized);
  });
}
