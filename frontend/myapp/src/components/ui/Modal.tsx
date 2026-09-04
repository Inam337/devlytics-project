import type { ReactNode } from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { cn } from '@/libs/utils';

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  cancelText?: string;
  confirmText?: string;
  onCancel?: () => void;
  onConfirm?: () => void;
  isLoading?: boolean;
  className?: string;
  showCloseButton?: boolean;
}

export function Modal({
  open,
  onOpenChange,
  title,
  children,
  footer,
  cancelText,
  confirmText,
  onCancel,
  onConfirm,
  isLoading = false,
  className,
}: ModalProps) {
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onOpenChange(false);
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        className={cn('sm:max-w-lg', className)}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-0">
          {children}
        </div>
        {footer || (
          <DialogFooter className="flex gap-2 sm:gap-0">
            {cancelText && (
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                {cancelText}
              </Button>
            )}
            {confirmText && (
              <Button
                onClick={handleConfirm}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : confirmText}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
