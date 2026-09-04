import React, { useState, useRef, useEffect } from 'react';
import { DateRange, Range } from 'react-date-range';
import { format } from 'date-fns';

import 'react-date-range/dist/styles.css'; // main css file
import 'react-date-range/dist/theme/default.css'; // theme css file
import { IconColors } from '@/components/icons/types/RbIcon.types';
import { RbIcon } from '@/components/icons/common/RbIcon';
import { cn } from '@/libs/utils';

type DatePickerProps = {
  onDateSelect: (date: string) => void;
  initialDate?: Date;
  placeholder?: string;
  maxDate?: Date;
  minDate?: Date;
  disabled?: boolean;
};

export const DatePicker: React.FC<DatePickerProps> = ({
  onDateSelect,
  initialDate,
  maxDate,
  minDate,
  disabled = false,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<'bottom' | 'top'>('bottom');
  const datePickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const ICON_SIZE = 16;
  const handleSelect = (ranges: { selection: Range }) => {
    const pickedDate = ranges.selection.startDate;

    setSelectedDate(pickedDate);
    setOpen(false);
    // Emit value in YYYY-MM-DD to satisfy schema validation, keep display as DD/MM/YYYY
    onDateSelect(format(pickedDate, 'yyyy-MM-dd'));
  };

  // Sync internal state when initialDate prop changes (e.g., edit prepopulation or clearing)
  useEffect(() => {
    if (!initialDate) {
      // Clear the selected date when initialDate is undefined/null
      setSelectedDate(null);

      return;
    }

    // Check if selectedDate is null before calling toDateString()
    if (!selectedDate) {
      setSelectedDate(initialDate);

      return;
    }

    const a = selectedDate.toDateString();
    const b = initialDate.toDateString();

    if (a !== b) {
      setSelectedDate(initialDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDate?.getTime()]);

  const calculatePosition = () => {
    if (!inputRef.current) return 'bottom';

    const rect = inputRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = 280; // Approximate height of the date picker dropdown
    // Calculate available space below and above
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    // Check if we're inside a modal or scrollable container
    const modalElement: HTMLElement | null = inputRef.current.closest('[role="dialog"]');

    if (!modalElement) {
      // Try to find any scrollable parent
      let parent = inputRef.current.parentElement;

      while (parent && parent !== document.body) {
        const style = window.getComputedStyle(parent);
        const isScrollable = style.overflow === 'auto'
          || style.overflow === 'scroll'
          || style.overflowY === 'auto'
          || style.overflowY === 'scroll';

        if (isScrollable) {
          const parentRect = parent.getBoundingClientRect();
          const parentSpaceBelow = parentRect.bottom - rect.bottom;
          const parentSpaceAbove = rect.top - parentRect.top;

          // If inside a scrollable container, use container's viewport
          if (parentSpaceBelow < dropdownHeight && parentSpaceAbove > dropdownHeight) {
            return 'top';
          }

          if (parentSpaceBelow >= dropdownHeight) {
            return 'bottom';
          }

          if (parentSpaceAbove >= dropdownHeight) {
            return 'top';
          }
        }

        parent = parent.parentElement;
      }
    } else {
      // We're inside a modal, calculate based on modal's visible area
      const modalRect = modalElement.getBoundingClientRect();
      const modalSpaceBelow = modalRect.bottom - rect.bottom;
      const modalSpaceAbove = rect.top - modalRect.top;
      // Add some padding (e.g., 20px) to ensure the dropdown doesn't touch edges
      const padding = 20;
      const requiredSpace = dropdownHeight + padding;

      // If there's not enough space below in the modal but enough above, show above
      if (modalSpaceBelow < requiredSpace && modalSpaceAbove >= requiredSpace) {
        return 'top';
      }

      // If there's enough space below in the modal, show below
      if (modalSpaceBelow >= requiredSpace) {
        return 'bottom';
      }

      // If there's enough space above in the modal, show above
      if (modalSpaceAbove >= requiredSpace) {
        return 'top';
      }

      // If neither has enough space, prefer top if it has more space
      if (modalSpaceAbove > modalSpaceBelow) {
        return 'top';
      }
    }

    // Fallback: use window viewport calculations
    // Add padding to ensure dropdown doesn't touch edges
    const padding = 20;
    const requiredSpace = dropdownHeight + padding;

    // If there's not enough space below but enough above, show above
    if (spaceBelow < requiredSpace && spaceAbove >= requiredSpace) {
      return 'top';
    }

    // If neither has enough space, prefer top if it has more space
    if (spaceAbove > spaceBelow) {
      return 'top';
    }

    // Default to bottom
    return 'bottom';
  };

  const handleOpen = () => {
    if (disabled) return;

    const newPosition = calculatePosition();

    setPosition(newPosition);
    setOpen(!open);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
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

  // Recalculate position when window resizes or modal scrolls
  useEffect(() => {
    const handleResize = () => {
      if (open) {
        const newPosition = calculatePosition();

        setPosition(newPosition);
      }
    };

    const handleScroll = () => {
      if (open) {
        const newPosition = calculatePosition();

        setPosition(newPosition);
      }
    };

    window.addEventListener('resize', handleResize);

    // Listen to scroll events on the document and any scrollable parents
    const currentInput = inputRef.current;

    if (open && currentInput) {
      // Find scrollable parent (modal or other container)
      let scrollableParent: HTMLElement | null = currentInput.closest('[role="dialog"]');

      if (!scrollableParent) {
        let parent = currentInput.parentElement;

        while (parent && parent !== document.body) {
          const style = window.getComputedStyle(parent);
          const isScrollable = style.overflow === 'auto'
            || style.overflow === 'scroll'
            || style.overflowY === 'auto'
            || style.overflowY === 'scroll';

          if (isScrollable) {
            scrollableParent = parent;
            break;
          }

          parent = parent.parentElement;
        }
      }

      if (scrollableParent) {
        scrollableParent.addEventListener('scroll', handleScroll, true);
      }

      document.addEventListener('scroll', handleScroll, true);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('scroll', handleScroll, true);

      if (currentInput) {
        let scrollableParent: HTMLElement | null = currentInput.closest('[role="dialog"]');

        if (!scrollableParent) {
          let parent = currentInput.parentElement;

          while (parent && parent !== document.body) {
            const style = window.getComputedStyle(parent);
            const isScrollable = style.overflow === 'auto'
              || style.overflow === 'scroll'
              || style.overflowY === 'auto'
              || style.overflowY === 'scroll';

            if (isScrollable) {
              scrollableParent = parent;
              break;
            }

            parent = parent.parentElement;
          }
        }

        if (scrollableParent) {
          scrollableParent.removeEventListener('scroll', handleScroll, true);
        }
      }
    };
  }, [open]);

  return (
    <div
      className="relative w-full"
      ref={datePickerRef}
    >
      <div className="relative">
        <input
          ref={inputRef}
          readOnly
          onClick={handleOpen}
          disabled={disabled}
          value={selectedDate ? format(selectedDate, 'dd/MM/yyyy') : ''}
          placeholder="DD/MM/YYYY"
          className={cn(
            'flex h-9 w-full bg-white rounded-md border border-gray-300',
            ' hover:border-gray-700 py-2 text-sm text-foreground',
            'ring-offset-background file:border-0 file:bg-transparent',
            'file:text-sm file:font-medium placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
            'disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
            'pl-3 pr-10',
            disabled && 'bg-gray-100',
          )}
        />
        <div className="absolute inset-y-0 right-3 flex items-center">
          <RbIcon
            name="datePicker"
            size={ICON_SIZE}
            color={IconColors.GRAY_COLOR_ICON}
          />
        </div>
      </div>
      {open && (
        <div
          className={cn(
            `absolute z-50 shadow-lg bg-white rounded-lg border
             border-gray-200 overflow-hidden`,
            position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
        >
          <DateRange
            ranges={[{
              startDate: selectedDate || new Date(),
              endDate: selectedDate || new Date(),
              key: 'selection',
            }]}
            onChange={handleSelect}
            showSelectionPreview={true}
            moveRangeOnFirstSelection={false}
            editableDateInputs={true}
            showDateDisplay={false}
            rangeColors={['#002D56']} // Primary color
            maxDate={maxDate}
            minDate={minDate}
          />
        </div>
      )}
    </div>
  );
};
