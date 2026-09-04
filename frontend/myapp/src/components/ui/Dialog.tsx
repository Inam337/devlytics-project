import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';

import { RbIcon } from '@/components/icons/common/RbIcon';
import { cn } from '@/libs/utils';
import { IconColors } from '@/components/icons/types/RbIcon.types';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;
const DIALOG_CLOSE_ICON_SIZE = 16;
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/60',
      'data-[state=open]:animate-in',
      'data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));

DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          ['fixed left-[50%] top-[50%] z-[60] grid w-full max-w-lg translate-x-[-50%] ',
            'translate-y-[-50%] gap-4 border bg-white ',
            'text-foreground p-4 shadow-lg duration-200 ',
            'data-[state=open]:animate-in data-[state=closed]:animate-out ',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 ',
            'data-[state=closed]:slide-out-to-left-1/2 ',
            'data-[state=closed]:slide-out-to-top-[48%] ',
            'data-[state=open]:slide-in-from-left-1/2 ',
            'data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg',
            className].join(' '),
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className={cn(
            'absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background z-50',
            'transition-opacity hover:opacity-50 focus:outline-none  disabled:pointer-events-none',
            'data-[state=open]:bg-accent data-[state=open]:text-muted-foreground cursor-pointer',
          )}
        >
          <RbIcon
            name="close"
            size={DIALOG_CLOSE_ICON_SIZE}
            color={IconColors.GRAY_COLOR_ICON}
            className="cursor-pointer"
          />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});

DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col space-y-1.5 text-center sm:text-left',
      className,
    )}
    {...props}
  />
);

DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      className,
    )}
    {...props}
  />
);

DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight',
      className,
    )}
    {...props}
  />
));

DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));

DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
