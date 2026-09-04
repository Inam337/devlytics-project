import type { ReactNode } from 'react';

import FieldError from '@/components/ui/FieldError';
import {
  fieldControlClass,
  fieldInvalidClass,
  fieldLabelClass,
  hasFieldError,
} from '@/components/ui/form-field-styles';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/libs/utils';

export type FormSelectOption = {
  value: string;
  label: ReactNode;
  disabled?: boolean;
};

export type FormSelectProps = {
  label?: ReactNode;
  htmlFor?: string;
  error?: string | null;
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  options: FormSelectOption[];
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  id?: string;
};

export default function FormSelect({
  label,
  htmlFor,
  error,
  placeholder,
  value,
  onValueChange,
  options,
  disabled,
  className,
  triggerClassName,
  id,
}: FormSelectProps) {
  const invalid = hasFieldError(error);

  return (
    <div className={cn('space-y-1', className)}>
      {label
        ? (
            <label
              htmlFor={htmlFor ?? id}
              className={fieldLabelClass}
            >
              {label}
            </label>
          )
        : null}
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger
          id={htmlFor ?? id}
          aria-invalid={invalid || undefined}
          className={cn(
            'w-full',
            fieldControlClass,
            'h-9 cursor-pointer data-[placeholder]:text-muted-foreground',
            invalid && fieldInvalidClass,
            triggerClassName,
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(option => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError msg={error} />
    </div>
  );
}
