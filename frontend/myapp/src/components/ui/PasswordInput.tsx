import { useState } from 'react';

import { HidePasswordIcon } from '@/components/icons/HidePassword.icon';
import { ShowPasswordIcon } from '@/components/icons/ShowPassword.icon';
import FieldError from '@/components/ui/FieldError';
import {
  fieldControlClass,
  fieldInvalidClass,
  fieldLabelClass,
  hasFieldError,
} from '@/components/ui/form-field-styles';
import { cn } from '@/libs/utils';

type PasswordInputProps = {
  name: string;
  id?: string;
  className?: string;
  placeholder?: string;
  error?: string;
  label?: React.ReactNode;
  /**
   * Using any to avoid type errors with react-hook-form
   * Can be either:
   * - The register function from react-hook-form
   * - Already registered props (result of register(name, options))
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register?: any;
};

export default function PasswordInput({
  name,
  id,
  className,
  placeholder = 'Password',
  error,
  label,
  register,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const invalid = hasFieldError(error);
  const inputProps = register
    ? (typeof register === 'function' ? register(name) : register)
    : {};

  return (
    <div className="space-y-1">
      {label
        ? (
            <label
              htmlFor={id || name}
              className={fieldLabelClass}
            >
              {label}
            </label>
          )
        : null}
      <div className="relative w-full">
        <input
          {...inputProps}
          id={id || name}
          type={showPassword ? 'text' : 'password'}
          aria-invalid={invalid || undefined}
          className={cn(
            fieldControlClass,
            'h-9 pr-10',
            invalid && fieldInvalidClass,
            className,
          )}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setShowPassword(state => !state)}
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2 transform',
            'cursor-pointer border-none bg-transparent p-1 outline-none',
            'text-gray-500 transition-colors hover:text-gray-800',
          )}
          tabIndex={-1}
        >
          {showPassword
            ? (
                <HidePasswordIcon className="h-5 w-5" />
              )
            : (
                <ShowPasswordIcon className="h-5 w-5" />
              )}
        </button>
      </div>
      <FieldError msg={error} />
    </div>
  );
}
