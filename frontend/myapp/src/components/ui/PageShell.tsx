import type { ReactNode } from 'react';

import { cn } from '@/libs/utils';

const maxWidthClasses = {
  sm: 'max-w-2xl',
  md: 'max-w-3xl',
  lg: 'max-w-5xl',
  xl: 'max-w-6xl',
  full: 'max-w-full',
} as const;

export interface PageShellProps {
  title?: string;
  hint?: string;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  maxWidth?: keyof typeof maxWidthClasses;
}

export default function PageShell({
  title,
  hint,
  toolbar,
  children,
  className,
  contentClassName,
  maxWidth = 'md',
}: PageShellProps) {
  return (
    <div className={cn(maxWidthClasses[maxWidth], 'space-y-4', className)}>
      {title
        ? (
            <h2 className="text-lg font-semibold text-zentro-black-teal">
              {title}
            </h2>
          )
        : null}

      {hint
        ? (
            <p className="text-sm text-muted-foreground">
              {hint}
            </p>
          )
        : null}

      {toolbar}

      <div className={cn('space-y-4', contentClassName)}>
        {children}
      </div>
    </div>
  );
}
