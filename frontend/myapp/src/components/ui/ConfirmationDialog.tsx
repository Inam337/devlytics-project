import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { cn } from '@/libs/utils';
import { RbIcon } from '@/components/icons/common/RbIcon';
import { IconColors } from '@/components/icons/types/RbIcon.types';
import type { IconKey } from '@/components/icons/config/icons.registry';

export type ConfirmationDialogType = 'delete' | 'warning' | 'info' | 'success';

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type?: ConfirmationDialogType;
  title: string;
  description: string;
  details?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmButtonVariant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
  isLoading?: boolean;
}

const dialogConfig: Record<
  ConfirmationDialogType,
  {
    icon: IconKey;
    iconColor: string;
    titleColor: string;
    confirmButtonVariant: 'default' | 'destructive';
    defaultConfirmText: string;
    defaultCancelText: string;
  }
> = {
  delete: {
    icon: 'warning',
    iconColor: 'tex-primary-600',
    titleColor: 'text-primary-600',
    confirmButtonVariant: 'destructive',
    defaultConfirmText: 'Delete',
    defaultCancelText: 'Cancel',
  },
  warning: {
    icon: 'warning',
    iconColor: 'text-primary-600',
    titleColor: 'text-primary-600',
    confirmButtonVariant: 'default',
    defaultConfirmText: 'Continue',
    defaultCancelText: 'Cancel',
  },
  info: {
    icon: 'settings',
    iconColor: 'text-primary-600',
    titleColor: 'text-primary-600',
    confirmButtonVariant: 'default',
    defaultConfirmText: 'OK',
    defaultCancelText: 'Cancel',
  },
  success: {
    icon: 'checkMark',
    iconColor: 'text-primary-600',
    titleColor: 'text-primary-600',
    confirmButtonVariant: 'default',
    defaultConfirmText: 'OK',
    defaultCancelText: 'Cancel',
  },
};

export function ConfirmationDialog({
  open,
  onOpenChange,
  type = 'delete',
  title,
  description,
  details,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  confirmButtonVariant,
  isLoading = false,
}: ConfirmationDialogProps) {
  const config = dialogConfig[type];
  const IconComponent = config.icon;
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-full lg:max-w-1/4 bg-white">
        <DialogHeader>
          <DialogTitle
            className={cn(
              `flex items-center gap-2 ${config.titleColor}`,
            )}
          >
            <RbIcon
              name={IconComponent}
              size={12}
              color={IconColors.GRAY_COLOR_ICON}
            />
            {title}
          </DialogTitle>
          <DialogDescription className="text-left">
            {description}
            {details && (
              <>
                <br />
                <span className="font-medium text-gray-900">{details}</span>
              </>
            )}
            {type === 'delete' && (
              <>
                <br />
                <span className="text-sm text-gray-600">
                  This action cannot be undone.
                </span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="w-full sm:w-auto cursor-pointer"
            disabled={isLoading}
          >
            {cancelText || config.defaultCancelText}
          </Button>
          <Button
            variant={confirmButtonVariant || config.confirmButtonVariant}
            onClick={onConfirm}
            className={cn(
              'w-full sm:w-auto',
            )}
            disabled={isLoading}
          >
            {isLoading
              ? 'Loading...'
              : confirmText || config.defaultConfirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
