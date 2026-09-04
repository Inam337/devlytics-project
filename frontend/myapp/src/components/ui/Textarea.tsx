import * as React from 'react';

import { fieldControlClass } from '@/components/ui/form-field-styles';
import { cn } from '@/libs/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        fieldControlClass,
        'field-sizing-content min-h-16 resize-y py-2',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
