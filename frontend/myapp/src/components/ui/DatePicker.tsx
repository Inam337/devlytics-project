import { format } from 'date-fns';

import { RbIcon } from '@/components/icons/common/RbIcon';
import { IconColors } from '@/components/icons/types/RbIcon.types';
import { Button } from '@/components/ui/Button';
import { Calendar } from '@/components/ui/Calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/Popover';
import { cn } from '@/libs/utils';

interface DatePickerProps {
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = 'Pick a date',
  className,
  disabled = false,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !date && 'text-muted-foreground',
            className,
          )}
          disabled={disabled}
        >
          <RbIcon
            name="date"
            size={12}
            color={IconColors.GRAY_COLOR_ICON}
          />
          {date ? format(date, 'PPP') : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateChange}
        />
      </PopoverContent>
    </Popover>
  );
}
