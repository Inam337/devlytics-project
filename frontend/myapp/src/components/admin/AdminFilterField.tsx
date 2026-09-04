import type { ReactNode } from 'react';

import { adminInputClass, adminLabelClass } from '@/components/admin/admin-form-styles';
import { cn } from '@/libs/utils';

type AdminFilterFieldProps = {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
};

export default function AdminFilterField({
  label,
  htmlFor,
  children,
  className,
}: AdminFilterFieldProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <label
        htmlFor={htmlFor}
        className={adminLabelClass}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export function adminFilterSelectClass() {
  return adminInputClass;
}
