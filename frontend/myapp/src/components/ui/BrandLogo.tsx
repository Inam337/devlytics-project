import { cn } from '@/libs/utils';

type BrandLogoProps = {
  variant?: 'white' | 'color';
  collapsed?: boolean;
  className?: string;
};

/**
 * Placeholder text mark — no Devlytics logo assets exist yet.
 * Swap for an <img> once real branding is designed (see docs/Interactive design for Devlytics platform/).
 */
export function BrandLogo({
  variant = 'white',
  collapsed = false,
  className,
}: BrandLogoProps) {
  const textColorClass = variant === 'white' ? 'text-white' : 'text-brand-dark';

  if (collapsed) {
    return (
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-teal text-sm font-bold text-white',
          className,
        )}
      >
        D
      </span>
    );
  }

  return (
    <span
      className={cn(
        'text-lg font-semibold tracking-tight',
        textColorClass,
        className,
      )}
    >
      Devlytics
    </span>
  );
}
