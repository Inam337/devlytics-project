import * as React from 'react';

import { fieldControlClass } from '@/components/ui/form-field-styles';
import { cn } from '@/libs/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(
          fieldControlClass,
          'h-9 file:inline-flex file:h-7 file:border-0 file:bg-transparent',
          'file:text-sm file:font-medium file:text-foreground',
          'selection:bg-primary selection:text-primary-foreground',
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';

export { Input };
