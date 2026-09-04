import type { ReactNode } from 'react';

import { SlidersHorizontal } from '@/components/icons/FluentIcons';
import AppButton from '@/components/ui/AppButton';
import { useT } from '@/hooks/use-t';
import { cn } from '@/libs/utils';

export interface FilterPanelProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  onApply?: () => void;
  onClear?: () => void;
  applyLabel?: string;
  clearLabel?: string;
  title?: string;
  className?: string;
}

export default function FilterPanel({
  open,
  children,
  onApply,
  onClear,
  applyLabel,
  clearLabel,
  title,
  className,
}: FilterPanelProps) {
  const { t } = useT();

  if (!open) {
    return null;
  }

  return (
    <div className={cn('mt-3', className)}>
      <div className="space-y-4 rounded-lg border border-gray-200/80 bg-[#FCF9F4] p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-zentro-black-teal">
          <SlidersHorizontal
            className="size-4 text-zentro-teal"
            aria-hidden
          />
          <span>{title ?? t('filters.title', 'Filters')}</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {children}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {onApply
            ? (
                <AppButton
                  color="primary"
                  onClick={onApply}
                >
                  {applyLabel ?? t('filters.apply', 'Apply filters')}
                </AppButton>
              )
            : null}
          {onClear
            ? (
                <AppButton
                  color="flat"
                  onClick={onClear}
                >
                  {clearLabel ?? t('filters.clear', 'Clear')}
                </AppButton>
              )
            : null}
        </div>
      </div>
    </div>
  );
}
