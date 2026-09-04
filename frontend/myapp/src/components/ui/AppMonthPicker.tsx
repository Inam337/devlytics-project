import React, { useState, useRef, useEffect } from 'react';
import { format, startOfMonth } from 'date-fns';

import { IconColors } from '@/components/icons/types/RbIcon.types';
import { RbIcon } from '@/components/icons/common/RbIcon';
import { cn } from '@/libs/utils';

const MONTH_NAMES = Array.from({ length: 12 }, (_, i) =>
  format(new Date(2000, i, 1), 'MMM'));
const DROPDOWN_HEIGHT = 260;

function parseMonthKey(monthKey: string): Date | null {
  try {
    const [y, m] = monthKey.split('-').map(Number);

    if (!y || !m) {
      return null;
    }

    return new Date(y, m - 1, 1);
  } catch {
    return null;
  }
}

function formatMonthLabel(monthKey: string): string {
  const date = parseMonthKey(monthKey);

  return date ? format(date, 'MMM yyyy') : monthKey;
}

function resolveValueDate(monthKey?: string): Date {
  if (!monthKey) {
    return startOfMonth(new Date());
  }

  return parseMonthKey(monthKey) ?? startOfMonth(new Date());
}

type AppMonthPickerProps = {
  onMonthSelect: (monthKey: string) => void;
  value?: string;
  placeholder?: string;
  minMonthKey?: string;
  maxMonthKey?: string;
  disabled?: boolean;
};

export const AppMonthPicker: React.FC<AppMonthPickerProps> = ({
  onMonthSelect,
  value,
  placeholder = 'Select month',
  minMonthKey,
  maxMonthKey,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<'bottom' | 'top'>('bottom');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const displayLabel = value ? formatMonthLabel(value) : '';
  const valueDate = resolveValueDate(value);
  const [viewYear, setViewYear] = useState(() => valueDate.getFullYear());

  useEffect(() => {
    if (value) {
      const [y] = value.split('-').map(Number);

      setViewYear(y);
    } else {
      setViewYear(new Date().getFullYear());
    }
  }, [value]);

  const minDate = minMonthKey ? parseMonthKey(minMonthKey) : null;
  const maxDate = maxMonthKey ? parseMonthKey(maxMonthKey) : null;
  const isMonthDisabled = (monthIndex: number) => {
    const d = new Date(viewYear, monthIndex, 1);

    if (minDate && d < minDate) {
      return true;
    }

    if (maxDate && d > maxDate) {
      return true;
    }

    return false;
  };

  const calculatePosition = () => {
    if (!inputRef.current) return 'bottom';

    const rect = inputRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const modalElement = inputRef.current.closest('[role="dialog"]');

    if (modalElement) {
      const modalRect = modalElement.getBoundingClientRect();
      const modalSpaceBelow = modalRect.bottom - rect.bottom;
      const modalSpaceAbove = rect.top - modalRect.top;
      const padding = 20;
      const required = DROPDOWN_HEIGHT + padding;

      if (modalSpaceBelow < required && modalSpaceAbove >= required) {
        return 'top';
      }

      if (modalSpaceBelow >= required) {
        return 'bottom';
      }

      if (modalSpaceAbove >= required) {
        return 'top';
      }

      if (modalSpaceAbove > modalSpaceBelow) {
        return 'top';
      }
    }

    const padding = 20;
    const required = DROPDOWN_HEIGHT + padding;

    if (spaceBelow < required && spaceAbove >= required) {
      return 'top';
    }

    if (spaceAbove > spaceBelow) {
      return 'top';
    }

    return 'bottom';
  };

  const handleOpen = () => {
    if (disabled) return;

    setPosition(calculatePosition());
    setOpen(true);
  };

  const handleSelectMonth = (monthIndex: number) => {
    const monthKey = `${viewYear}-${String(monthIndex + 1).padStart(2, '0')}`;

    if (isMonthDisabled(monthIndex)) return;

    onMonthSelect(monthKey);
    setOpen(false);
  };

  const canPrevYear = minDate
    ? new Date(viewYear - 1, 11, 1) >= minDate
    : true;
  const canNextYear = maxDate
    ? new Date(viewYear + 1, 0, 1) <= maxDate
    : true;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current
        && !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div
      className="relative w-full"
      ref={containerRef}
    >
      <div className="relative">
        <input
          ref={inputRef}
          readOnly
          onClick={handleOpen}
          disabled={disabled}
          value={displayLabel}
          placeholder={placeholder}
          className={cn(
            'flex h-9 w-full bg-white rounded-md border border-gray-300',
            'hover:border-gray-700 py-2 text-sm text-foreground',
            'ring-offset-background file:border-0 file:bg-transparent',
            'file:text-sm file:font-medium placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
            'disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
            'pl-3 pr-10',
            disabled && 'bg-gray-100',
          )}
        />
        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
          <RbIcon
            name="datePicker"
            size={16}
            color={IconColors.GRAY_COLOR_ICON}
          />
        </div>
      </div>
      {open && (
        <div
          className={cn(
            'absolute z-50 shadow-lg bg-white rounded-lg border border-gray-200',
            'overflow-hidden w-64 p-3',
            position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewYear(y => y - 1)}
              disabled={!canPrevYear}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none"
              aria-label="Previous year"
            >
              <RbIcon
                name="arrowDown"
                size={16}
                color={IconColors.BLACK_COLOR_ICON}
                className="rotate-90"
              />
            </button>
            <span className="text-sm font-semibold text-gray-900">
              {viewYear}
            </span>
            <button
              type="button"
              onClick={() => setViewYear(y => y + 1)}
              disabled={!canNextYear}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none"
              aria-label="Next year"
            >
              <RbIcon
                name="arrowDown"
                size={16}
                color={IconColors.BLACK_COLOR_ICON}
                className="-rotate-90"
              />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {MONTH_NAMES.map((name, monthIndex) => {
              const disabledMonth = isMonthDisabled(monthIndex);
              const monthKey = `${viewYear}-${String(monthIndex + 1).padStart(2, '0')}`;
              const isSelected = value === monthKey;

              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleSelectMonth(monthIndex)}
                  disabled={disabledMonth}
                  className={cn(
                    'py-2 px-2 text-sm rounded-md transition-colors',
                    isSelected
                      ? 'bg-[#002D56] text-white font-medium'
                      : 'hover:bg-gray-100 text-gray-800',
                    disabledMonth && 'opacity-40 cursor-not-allowed',
                  )}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
