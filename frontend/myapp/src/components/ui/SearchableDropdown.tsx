import { Command } from 'cmdk';
import { useState } from 'react';

import { RbIcon } from '@/components/icons/common/RbIcon';
import { IconColors } from '@/components/icons/types/RbIcon.types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/Popover';
import { cn } from '@/libs/utils';

const ALL_VALUE = 'all';

export type SearchableDropdownOption = {
  value: string;
  label: string;
};

export type SearchableDropdownProps = {
  value: string;
  onChange: (value: string) => void;
  options: SearchableDropdownOption[];
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
};

function selectTriggerClassNames(extra?: string) {
  return cn(
    [
      'border-gray-300 hover:border-gray-700',
      'cursor-pointer text-foreground',
      '[&_svg:not([class*=\'text-\'])]:text-black',
      'focus-visible:border-ring ',
      'focus-visible:ring-gray-600 text-black',
      'aria-invalid:ring-destructive/20',
      'aria-invalid:border-destructive ',
      'bg-white',
      'hover:bg-gray-50 ',
      'flex w-full min-w-0 items-center justify-between gap-2 ',
      'rounded-md border px-3 py-2 text-sm whitespace-nowrap ',
      'shadow-xs transition-[color,box-shadow] outline-none ',
      'focus-visible:ring-[2px] disabled:cursor-not-allowed ',
      'disabled:opacity-50 ',
      '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-4',
    ].join(' '),
    extra,
  );
}

export function SearchableDropdown({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  isLoading,
  className,
}: SearchableDropdownProps) {
  const [open, setOpen] = useState(false);
  const hasSelection
    = value === ALL_VALUE || options.some(o => o.value === value);
  const displayLabel = isLoading
    ? 'Loading...'
    : value === ALL_VALUE
      ? ''
      : options.find(o => o.value === value)?.label || placeholder || '';

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger
        type="button"
        disabled={disabled || isLoading}
        data-slot="searchable-dropdown-trigger"
        className={selectTriggerClassNames(className)}
      >
        <span
          className={cn(
            'line-clamp-1 min-w-0 flex-1 text-left',
            !isLoading && !hasSelection && 'text-muted-foreground',
          )}
        >
          {displayLabel}
        </span>
        <RbIcon
          name="arrowDown"
          size={12}
          color={IconColors.GRAY_COLOR_ICON}
        />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className={cn(
          'w-[var(--radix-popover-trigger-width)] min-w-[8rem] max-w-[calc(100vw-2rem)] z-60 p-0',
          'border-gray-300 cursor-default overflow-hidden text-black',
          'flex flex-col',
          'max-h-[min(var(--radix-popover-content-available-height),320px)]',
        )}
      >
        <Command className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
          <Command.Input
            placeholder="Search..."
            className={cn(
              'w-full border-0 border-b border-gray-300 bg-transparent px-3 py-2 text-sm',
              'text-black placeholder:text-muted-foreground outline-none',
            )}
          />
          <Command.List className="max-h-[min(240px,var(--radix-popover-content-available-height))]
          overflow-y-auto p-1"
          >
            <Command.Empty className="px-2 py-1.5 text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            {options.map(item => (

              <Command.Item
                key={item.value}
                value={item.label}
                className="relative cursor-pointer text-black hover:bg-gray-100 px-2 py-1.5
                 text-sm outline-hidden select-none whitespace-nowrap text-ellipsis overflow-hidden"
                onSelect={(selected) => {
                  const found = options.find(o => o.label === selected);

                  if (found) {
                    onChange(found.value);
                    setOpen(false);
                  }
                }}
              >

                {item.label}
                <span className="absolute top-2 right-2 flex size-3.5 items-center justify-center">
                  {value === item.value && (
                    <RbIcon
                      name="checkTick"
                      size={12}
                      color={IconColors.PRIMARY_COLOR_ICON}
                    />
                  )}
                </span>
              </Command.Item>

            ))}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
