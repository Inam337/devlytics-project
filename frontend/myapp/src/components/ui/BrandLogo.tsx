import logoNavy from '@/assets/logos/devlytics-logo-navy.svg';
import logoWhite from '@/assets/logos/devlytics-logo-white.svg';
import markNavy from '@/assets/logos/devlytics-mark.svg';
import markWhite from '@/assets/logos/devlytics-mark-white.svg';
import { cn } from '@/libs/utils';

type BrandLogoProps = {
  /** 'white' for dark/gradient grounds, 'color' (navy) for light grounds */
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
        src={variant === 'white' ? markWhite : markNavy}
        alt="Devlytics"
        className={cn('h-8 w-8 shrink-0', className)}
      />
    );
  }

  return (
    <img
      src={variant === 'white' ? logoWhite : logoNavy}
      alt="Devlytics"
      className={cn('h-8 w-auto', className)}
    />
  );
}
