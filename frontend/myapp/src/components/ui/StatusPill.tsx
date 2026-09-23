import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/libs/utils';

const statusPillVariants = cva(
  `inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs
   font-medium w-fit whitespace-nowrap shrink-0 capitalize`,
  {
    variants: {
      variant: {
        default: 'bg-brand-teal/15 text-brand-teal border border-brand-teal/25',
        mint: 'bg-brand-mint/30 text-brand-dark border border-brand-mint/40',
        teal: 'bg-brand-teal text-white border border-transparent',
        success: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
        warning: 'bg-amber-50 text-amber-800 border border-amber-200',
        danger: 'bg-red-50 text-red-700 border border-red-200',
        neutral: 'bg-muted text-muted-foreground border border-border',
        outline: 'bg-white text-brand-dark border border-border',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface StatusPillProps
  extends React.ComponentProps<'span'>,
  VariantProps<typeof statusPillVariants> {}

function StatusPill({ className, variant, ...props }: StatusPillProps) {
  return (
    <span
      data-slot="status-pill"
      className={cn(statusPillVariants({ variant }), className)}
      {...props}
    />
  );
}

export default StatusPill;
export { statusPillVariants };
