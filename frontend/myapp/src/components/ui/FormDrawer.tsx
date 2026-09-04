import type { FormEvent, ReactNode } from 'react';

import AppButton from '@/components/ui/AppButton';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/Sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/libs/utils';

const sizeClasses = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
} as const;

export interface FormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  onSubmit?: () => void | Promise<void>;
  submitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  size?: keyof typeof sizeClasses;
  children: ReactNode;
  className?: string;
}

export default function FormDrawer({
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
  submitting = false,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  size = 'md',
  children,
  className,
}: FormDrawerProps) {
  const isMobile = useIsMobile();
  const side = isMobile ? 'bottom' : 'right';
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onSubmit?.();
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
    >
      <SheetContent
        side={side}
        className={cn(
          'flex flex-col gap-0 p-0',
          side === 'right' && cn('w-full sm:w-[min(100%,28rem)]', sizeClasses[size]),
          side === 'bottom' && 'max-h-[90vh] rounded-t-xl',
          className,
        )}
        aria-describedby={description ? 'form-drawer-description' : undefined}
      >
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <SheetHeader className="shrink-0 border-b border-border px-4 py-4 pr-12 text-left">
            <SheetTitle
              id="form-drawer-title"
              className="text-lg text-zentro-black-teal"
            >
              {title}
            </SheetTitle>
            {description
              ? (
                  <SheetDescription id="form-drawer-description">
                    {description}
                  </SheetDescription>
                )
              : null}
          </SheetHeader>

          <div className="thin-scroll flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {children}
          </div>

          <SheetFooter className="shrink-0 flex-row gap-2 border-t border-border bg-white px-4 py-4">
            <AppButton
              type="submit"
              color="primary"
              loading={submitting}
              disabled={submitting}
            >
              {submitLabel}
            </AppButton>
            <AppButton
              type="button"
              color="flat"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
            >
              {cancelLabel}
            </AppButton>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
