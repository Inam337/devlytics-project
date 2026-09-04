import type { ReactNode } from 'react';

import { FilterIcon, SearchIcon } from '@/components/icons/FluentIcons';
import AppButton from '@/components/ui/AppButton';
import FilterPanel from '@/components/ui/FilterPanel';
import { Input } from '@/components/ui/Input';
import { useT } from '@/hooks/use-t';
import { cn } from '@/libs/utils';

export interface PageToolbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  showFilters?: boolean;
  filtersOpen?: boolean;
  onFiltersToggle?: () => void;
  onFiltersOpenChange?: (open: boolean) => void;
  filterContent?: ReactNode;
  onApplyFilters?: () => void;
  onClearFilters?: () => void;
  primaryLabel?: string;
  onPrimaryClick?: () => void;
  primaryHidden?: boolean;
  primaryAction?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export default function PageToolbar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder,
  showSearch = false,
  showFilters = false,
  filtersOpen = false,
  onFiltersToggle,
  onFiltersOpenChange,
  filterContent,
  onApplyFilters,
  onClearFilters,
  primaryLabel,
  onPrimaryClick,
  primaryHidden = false,
  primaryAction,
  actions,
  className,
}: PageToolbarProps) {
  const { t } = useT();
  const handleFiltersToggle = () => {
    if (onFiltersToggle) {
      onFiltersToggle();

      return;
    }

    onFiltersOpenChange?.(!filtersOpen);
  };

  return (
    <div className={cn('space-y-0', className)}>
      <div className="flex flex-wrap items-center gap-3">
        {showSearch
          ? (
              <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
                <SearchIcon
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  type="search"
                  value={searchValue}
                  onChange={event => onSearchChange?.(event.target.value)}
                  placeholder={searchPlaceholder ?? t('toolbar.search', 'Search...')}
                  className="h-9 rounded-md border-border bg-white pl-9"
                  aria-label={searchPlaceholder ?? t('toolbar.search', 'Search...')}
                />
              </div>
            )
          : null}

        {showFilters
          ? (
              <AppButton
                color="flat"
                className={cn(
                  'border border-border bg-white text-zentro-black-teal',
                  filtersOpen && 'border-zentro-teal bg-zentro-mint/10',
                )}
                onClick={handleFiltersToggle}
              >
                <FilterIcon
                  className="mr-1.5 inline size-4"
                  aria-hidden="true"
                />
                {t('toolbar.filters', 'Filters')}
              </AppButton>
            )
          : null}

        {actions}

        <div className="flex-1" />

        {!primaryHidden && (primaryAction ?? (
          primaryLabel && onPrimaryClick
            ? (
                <AppButton
                  color="primary"
                  onClick={onPrimaryClick}
                >
                  {primaryLabel}
                </AppButton>
              )
            : null
        ))}
      </div>

      {showFilters && filterContent
        ? (
            <FilterPanel
              open={filtersOpen}
              onOpenChange={onFiltersOpenChange}
              onApply={onApplyFilters}
              onClear={onClearFilters}
            >
              {filterContent}
            </FilterPanel>
          )
        : null}
    </div>
  );
}
