import type { ReactNode } from 'react';

import FieldError from '@/components/ui/FieldError';
import { fieldLabelClass } from '@/components/ui/form-field-styles';
import { cn } from '@/libs/utils';

export type FormFieldProps = {
  label?: ReactNode;
  htmlFor?: string;
  error?: string | null;
  className?: string;
  labelClassName?: string;
  children: ReactNode;
};

export default function FormField({
  label,
  htmlFor,
  error,
  className,
  labelClassName,
  children,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {label
        ? (
            <label
              htmlFor={htmlFor}
              className={cn(fieldLabelClass, labelClassName)}
            >
              {label}
            </label>
          )
        : null}
      {children}
      <FieldError msg={error} />
    </div>
  );
}
