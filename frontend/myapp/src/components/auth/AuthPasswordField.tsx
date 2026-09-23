import { useState } from 'react';

import { HidePasswordIcon } from '@/components/icons/HidePassword.icon';
import { ShowPasswordIcon } from '@/components/icons/ShowPassword.icon';
import FieldError from '@/components/ui/FieldError';
import { cn } from '@/libs/utils';

type AuthPasswordFieldProps = {
  name: string;
  id?: string;
  label: React.ReactNode;
  error?: string;
  autoComplete?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register?: any;
};

/** Mono-uppercase-label password input matching Devlytics.dc.html's auth screens */
export default function AuthPasswordField({
  name,
  id,
  label,
  error,
  autoComplete,
  register,
}: AuthPasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const inputProps = register
    ? (typeof register === 'function' ? register(name) : register)
    : {};

  return (
    <label
      htmlFor={id ?? name}
      className="flex min-w-0 flex-col gap-1"
    >
      <span
        className="uppercase text-[#64748B]"
        style={{ font: '500 11px/1 \'IBM Plex Mono\', monospace', letterSpacing: '.09em' }}
      >
        {label}
      </span>
      <div className="relative w-full">
        <input
          {...inputProps}
          id={id ?? name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error) || undefined}
          className={cn(
            'w-full min-w-0 rounded-lg border bg-white px-[14px] py-2 pr-10 text-sm',
            'text-[#241d4d] outline-none transition-colors',
            error ? 'border-[#B4192F]' : 'border-[#E2E8F0] focus:border-[#372b73]',
          )}
        />
        <button
          type="button"
          onClick={() => setVisible(state => !state)}
          tabIndex={-1}
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer border-none bg-transparent p-1',
            'text-[#5C6879] outline-none transition-colors hover:text-[#241d4d]',
          )}
        >
          {visible ? <HidePasswordIcon className="h-5 w-5" /> : <ShowPasswordIcon className="h-5 w-5" />}
        </button>
      </div>
      <FieldError msg={error} />
    </label>
  );
}
