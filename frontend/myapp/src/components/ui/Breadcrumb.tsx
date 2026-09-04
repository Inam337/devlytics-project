import React from 'react';
import { Link } from 'react-router-dom';

import { cn } from '@/libs/utils';
import { IconColors } from '@/components/icons/types/RbIcon.types';
import { RbIcon } from '@/components/icons/common/RbIcon';

interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrent?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <BreadcrumbList>
      {items.map((item, index) => {
        const breadcrumbContent = item.isCurrent
          ? <BreadcrumbPage>{item.label}</BreadcrumbPage>
          : <BreadcrumbLink href={item.href || '#'}>{item.label}</BreadcrumbLink>;

        return (
          <React.Fragment key={index}>
            <BreadcrumbItem>
              {breadcrumbContent}
            </BreadcrumbItem>
            {index < items.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>
        );
      })}
    </BreadcrumbList>
  );
};

// Legacy components for backward compatibility
export const BreadcrumbList: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    aria-label="Breadcrumb"
    className="w-full border-0 border-b-0"
  >
    <span className="flex flex-wrap items-center space-x-1 md:space-x-2 text-sm md:text-base
      border-0 border-b-0"
    >
      {children}
    </span>
  </div>
);

export const BreadcrumbItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-center min-w-0">
    {children}
  </li>
);

export const BreadcrumbLink: React.FC<{
  children: React.ReactNode;
  asChild?: boolean;
  href?: string;
}> = ({ children, asChild, href }) => {
  if (asChild) {
    return <>{children}</>;
  }

  return (
    <Link
      to={href || '#'}
      className="text-gray-600 hover:text-gray-900 transition-colors duration-200
       truncate max-w-[120px] md:max-w-none not-[]:focus:ring-2
      rounded px-1 py-0.5"
      title={children as string}
    >
      {children}
    </Link>
  );
};

export const BreadcrumbPage: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <span
      className={cn(
        'text-gray-900 font-semibold truncate max-w-[150px] md:max-w-none',
        className,
      )}
      title={children as string}
    >
      {children}
    </span>
  );
};

export const BreadcrumbSeparator: React.FC = () => {
  const ICON_SIZE = 16;

  return (
    <span
      className="text-gray-400 mx-1 md:mx-2 flex-shrink-0"
      aria-hidden="true"
    >
      <RbIcon
        name="arrowChevronRight"
        size={ICON_SIZE}
        color={IconColors.GRAY_COLOR_ICON}
      />
    </span>
  );
};
