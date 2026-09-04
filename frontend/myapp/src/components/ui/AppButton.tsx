import React from 'react';
import clsx from 'clsx';

import { RbIcon } from '../icons/common/RbIcon';
import { IconColors } from '@/components/icons/types/RbIcon.types';

interface AppButtonProps {
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'flat';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
}

export default function AppButton({
  children,
  type = 'button',
  color = 'primary',
  loading,
  disabled,
  className,
  onClick,
}: AppButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(
        'btn',
        `btn-${color}`,
        className,
      )}
    >
      {
        loading
          ? (
              <RbIcon
                name="arrowChevronRight"
                size={16}
                color={IconColors.PRIMARY_COLOR_ICON}
              />
            )
          : (
              children
            )
      }
    </button>
  );
}
