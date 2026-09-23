import * as React from 'react';

import FieldError from '@/components/ui/FieldError';
import { cn } from '@/libs/utils';

interface AuthFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: React.ReactNode;
  error?: string;
  /** Grid column span for register's 2-col field grid (e.g. 'span 2') */
  span?: string;
}

/** Mono-uppercase-label input matching Devlytics.dc.html's auth screens */
const AuthField = React.forwardRef<HTMLInputElement, AuthFieldProps>(
  ({ label, error, id, className, span, ...props }, ref) => (
    <label
      htmlFor={id}
      className="flex min-w-0 flex-col gap-1"
      style={span ? { gridColumn: span } : undefined}
    >
      <span
        className="uppercase text-[#64748B]"
        style={{ font: '500 11px/1 \'IBM Plex Mono\', monospace', letterSpacing: '.09em' }}
      >
        {label}
      </span>
      <input
        id={id}
        ref={ref}
        aria-invalid={Boolean(error) || undefined}
        className={cn(
          'w-full min-w-0 rounded-lg border bg-white px-[14px] py-2 text-sm',
          'text-[#241d4d] outline-none transition-colors',
          error ? 'border-[#B4192F]' : 'border-[#E2E8F0] focus:border-[#372b73]',
          className,
        )}
        {...props}
      />
      <FieldError msg={error} />
    </label>
  ),
);

AuthField.displayName = 'AuthField';

export default AuthField;
