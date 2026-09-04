import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/libs/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md',
    'text-sm text-primary font-medium transition-all disabled:pointer-events-none',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    '[&_svg]:pointer-events-none [&_svg:not([class*=\'size-\'])]:size-4 shrink-0 [&_svg]:shrink-0',
    'outline-none focus-visible:border-blue-600 focus-visible:ring-blue-600/20 ',
    'focus-visible:ring-[0px] border-blue-600 ',
    'aria-invalid:ring-destructive/20',
    'aria-invalid:border-destructive ',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'bg-primary text-primary-foreground text-white',
          'hover:bg-primary-hover hover:text-white cursor-pointer',
        ].join(' '),
        destructive: [
          'bg-white !text-gray-900 shadow-xs hover:bg-gray-50',
          'cursor-pointer border border-destructive',
          'focus-visible:ring-destructive/20',
        ].join(' '),
        outline: [
          'bg-white border-1 hover:bg-gray-50 text-primary border-blue-900',
          'text-primary shadow-xs text-primary hover:bg-accent',
          'hover:text-accent-foreground',
          'cursor-pointer hover:bg-blue-50 shadow-sm',
        ].join(' '),

        secondary:
          'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 cursor-pointer',
        ghost:
          `hover:bg-accent hover:text-accent-foreground cursor-pointer
           border-gray-200 cursor-pointer`,
        link: 'text-primary underline-offset-4 cursor-pointer hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'>
  & VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
