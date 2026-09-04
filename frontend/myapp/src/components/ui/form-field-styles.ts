export const fieldLabelClass = 'block text-sm font-medium text-gray-700';

export const fieldControlClass = [
  'flex w-full min-w-0 rounded-md border border-gray-200 bg-white',
  'px-3 py-2 text-sm text-foreground shadow-xs',
  'transition-[color,box-shadow] outline-none',
  'placeholder:text-muted-foreground',
  'focus-visible:border-gray-500 focus-visible:ring-2 focus-visible:ring-gray-300/40',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'aria-invalid:border-[var(--field-error-border)]',
  'aria-invalid:focus-visible:border-[var(--field-error-border)]',
  'aria-invalid:focus-visible:ring-2',
  'aria-invalid:focus-visible:ring-[var(--field-error-border)]/15',
].join(' ');

export const fieldInvalidClass = [
  'border-[var(--field-error-border)]',
  'focus-visible:border-[var(--field-error-border)]',
  'focus-visible:ring-2',
  'focus-visible:ring-[var(--field-error-border)]/15',
].join(' ');

export function hasFieldError(error?: string | null): boolean {
  return Boolean(error?.trim());
}
