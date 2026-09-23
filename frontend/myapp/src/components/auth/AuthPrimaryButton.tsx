import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/libs/utils';

interface AuthPrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

/** Solid violet CTA matching Devlytics.dc.html's auth "Sign In" / "Create account" buttons */
export default function AuthPrimaryButton({
  children,
  loading,
  disabled,
  className,
  ...props
}: AuthPrimaryButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className={cn(
        'cursor-pointer rounded-lg border-none bg-[#372b73] px-4 py-2.5',
        'text-sm font-semibold text-white transition-colors',
        'hover:bg-[#4b3a95] disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    >
      {loading
        ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              {children}
            </span>
          )
        : (
            children
          )}
    </button>
  );
}
