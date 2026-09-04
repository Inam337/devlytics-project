import type { ReactNode } from 'react';

import { cn } from '@/libs/utils';

export interface ListCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
}

export default function ListCard({
  title,
  subtitle,
  meta,
  badge,
  actions,
  onClick,
  className,
  children,
}: ListCardProps) {
  const interactive = Boolean(onClick);

  return (
    <article
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={interactive
        ? (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onClick?.();
            }
          }
        : undefined}
      className={cn(
        'bg-card-gradient flex flex-wrap items-center justify-between gap-3 p-4',
        interactive && 'cursor-pointer transition-shadow hover:shadow-md',
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-start gap-2">
          <h3 className="font-medium text-zentro-black-teal">{title}</h3>
          {badge}
        </div>
        {subtitle
          ? (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )
          : null}
        {meta
          ? (
              <p className="text-xs text-muted-foreground">{meta}</p>
            )
          : null}
        {children}
      </div>
      {actions
        ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          )
        : null}
    </article>
  );
}
