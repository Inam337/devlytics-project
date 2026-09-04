import { brandIcon, logoColor, logoWhite } from '@/assets';
import { cn } from '@/libs/utils';

type BrandLogoProps = {
  variant?: 'white' | 'color';
  collapsed?: boolean;
  className?: string;
};

export function BrandLogo({
  variant = 'white',
  collapsed = false,
  className,
}: BrandLogoProps) {
  if (collapsed) {
    return (
      <img
        src={brandIcon}
        alt="Zentro"
        className={cn('h-8 w-8 shrink-0 object-contain', className)}
      />
    );
  }

  const logoSrc = variant === 'white' ? logoWhite : logoColor;

  return (
    <img
      src={logoSrc}
      alt="Zentro"
      className={cn(
        'h-8 w-auto max-w-[9.5rem] shrink-0 object-contain object-left',
        className,
      )}
    />
  );
}
