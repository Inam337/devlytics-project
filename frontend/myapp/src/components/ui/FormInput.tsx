import * as React from 'react';

import FieldError from '@/components/ui/FieldError';
import { Input } from '@/components/ui/Input';
import { fieldInvalidClass, fieldLabelClass, hasFieldError } from '@/components/ui/form-field-styles';
import { cn } from '@/libs/utils';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: React.ReactNode;
}

const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, error, label, id, ...props }, ref) => {
    const invalid = hasFieldError(error);

    return (
      <div className="space-y-1">
        {label
          ? (
              <label
                htmlFor={id}
                className={fieldLabelClass}
              >
                {label}
              </label>
            )
          : null}
        <Input
          id={id}
          aria-invalid={invalid || undefined}
          className={cn(invalid && fieldInvalidClass, className)}
          ref={ref}
          {...props}
        />
        <FieldError msg={error} />
      </div>
    );
  },
);

FormInput.displayName = 'FormInput';

export { FormInput };
