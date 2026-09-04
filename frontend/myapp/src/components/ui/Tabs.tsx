import * as React from 'react';

import { cn } from '@/libs/utils';

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

interface TabsListProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (value: string) => void;
  className?: string;
}

interface TabsTriggerProps {
  tabValue: string;
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (value: string) => void;
  className?: string;
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  activeTab?: string;
  className?: string;
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <div
      className={cn('w-full', className)}
      role="tablist"
    >
      {React.Children.map(children, (child) => {
        if (
          React.isValidElement(child)
          && (child.type as React.ComponentType).displayName === 'TabsList'
        ) {
          return React.cloneElement(
            child as React.ReactElement<TabsListProps>,
            {
              activeTab: value,
              onTabChange: onValueChange,
            },
          );
        }

        if (
          React.isValidElement(child)
          && (child.type as React.ComponentType).displayName === 'TabsContent'
        ) {
          return React.cloneElement(
            child as React.ReactElement<TabsContentProps>,
            {
              activeTab: value,
            },
          );
        }

        return child;
      })}
    </div>
  );
}

export function TabsList({
  children,
  activeTab,
  onTabChange,
  className,
}: TabsListProps) {
  return (
    <div
      className={cn('inline-flex items-center p-1 rounded-md', className)}
      role="tablist"
    >
      {React.Children.map(children, (child) => {
        if (
          React.isValidElement(child)
          && (child.type as React.ComponentType).displayName === 'TabsTrigger'
        ) {
          return React.cloneElement(
            child as React.ReactElement<TabsTriggerProps>,
            {
              activeTab,
              onTabChange,
            },
          );
        }

        return child;
      })}
    </div>
  );
}

TabsList.displayName = 'TabsList';

export function TabsTrigger({
  tabValue,
  children,
  activeTab,
  onTabChange,
  className,
}: TabsTriggerProps) {
  const isActive = activeTab === tabValue;

  return (
    <button
      type="button"
      role="tab"
      data-state={isActive ? 'active' : 'inactive'}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap',
        'rounded-sm px-3 py-1.5 text-sm font-medium',
        'text-foreground',
        'ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-ring focus-visible:ring-offset-2',
        'data-[state=active]:bg-background',
        'data-[state=active]:text-foreground',
        'data-[state=active]:shadow-sm',
        'hover:bg-muted/50',
        className,
      )}
      onClick={() => onTabChange && onTabChange(tabValue)}
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
    >
      {children}
    </button>
  );
}

TabsTrigger.displayName = 'TabsTrigger';

export function TabsContent({
  value,
  children,
  activeTab,
  className,
}: TabsContentProps) {
  const isActive = activeTab === value;

  if (!isActive) {
    return null;
  }

  return (
    <div
      className={cn('', className)}
      role="tabpanel"
      aria-labelledby={`tab-${value}`}
    >
      {children}
    </div>
  );
}

TabsContent.displayName = 'TabsContent';
