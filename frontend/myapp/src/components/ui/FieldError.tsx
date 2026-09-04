import { cn } from '@/libs/utils';

export type FieldErrorProps = {
  msg?: string | null;
  className?: string;
  /** field = below input (left); form = centered banner for submit/API errors */
  variant?: 'field' | 'form';
};

export default function FieldError({
  msg,
  className,
  variant = 'field',
}: FieldErrorProps) {
  if (!msg?.trim()) {
    return null;
  }

  const pill = (
    <span
      className={cn(
        'inline-flex max-w-full items-center rounded-md px-2.5 py-1',
        'bg-[var(--field-error-bg)] text-xs font-medium',
        'text-[var(--field-error-text)]',
        className,
      )}
    >
      {msg}
    </span>
  );

  if (variant === 'form') {
    return (
      <div className="flex w-full justify-center pt-1">
        {pill}
      </div>
    );
  }

  return (
    <div className="pt-1">
      {pill}
    </div>
  );
}
