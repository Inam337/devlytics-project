import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';

import { RbIcon } from '@/components/icons/common/RbIcon';
import { IconColors } from '@/components/icons/types/RbIcon.types';
import { cn } from '@/libs/utils';

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer h-5 w-5 shrink-0 rounded-sm border border-gray-300',
        'bg-white ring-offset-background',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ',
        'focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-primary ',
        'data-[state=checked]:text-white',
        'data-[state=checked]:border-primary-700',
        'hover:border-primary ',
        'data-[state=checked]:hover:border-primary',
        'transition-colors duration-150',
        'cursor-pointer',
        'relative',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-white absolute inset-0"
      >
        <RbIcon
          name="checkTick"
          size={10}
          color={IconColors.WHITE_COLOR_ICON}
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
