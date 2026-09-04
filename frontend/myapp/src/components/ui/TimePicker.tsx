import * as React from 'react';

import { RbIcon } from '@/components/icons/common/RbIcon';
import { IconColors } from '@/components/icons/types/RbIcon.types';
import { cn } from '@/libs/utils';
import { Button } from '@/components/ui/Button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/Popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';

interface TimePickerProps {
  time?: string;
  onTimeChange?: (time: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function TimePicker({
  time,
  onTimeChange,
  placeholder = 'Select time',
  className,
  disabled = false,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedHour, setSelectedHour] = React.useState<string>('');
  const [selectedMinute, setSelectedMinute] = React.useState<string>('');
  const prevTimePropRef = React.useRef<string | undefined>(time);
  const onTimeChangeRef = React.useRef(onTimeChange);

  // Keep ref updated
  React.useEffect(() => {
    onTimeChangeRef.current = onTimeChange;
  }, [onTimeChange]);

  // Parse time prop and update internal state (only when prop changes)
  React.useEffect(() => {
    // Only update if time prop actually changed
    if (prevTimePropRef.current !== time) {
      prevTimePropRef.current = time;

      if (time) {
        // Handle both "HH:MM" and "HH:MM:SS" formats
        const parts = time.split(':');

        if (parts.length >= 2) {
          const hour = parts[0]?.trim().padStart(2, '0') || '';
          const minute = parts[1]?.trim().padStart(2, '0') || '';

          setSelectedHour(hour);
          setSelectedMinute(minute);
        } else {
          setSelectedHour('');
          setSelectedMinute('');
        }
      } else {
        setSelectedHour('');
        setSelectedMinute('');
      }
    }
  }, [time]);

  const handleHourChange = (hour: string) => {
    const currentMinute = selectedMinute;

    setSelectedHour(hour);

    // If minute is already selected, update parent immediately
    if (currentMinute && hour) {
      const timeString = `${hour}:${currentMinute}`;

      onTimeChangeRef.current?.(timeString);
    }
  };

  const handleMinuteChange = (minute: string) => {
    const currentHour = selectedHour;

    setSelectedMinute(minute);

    // If hour is already selected, update parent immediately
    if (currentHour && minute) {
      const timeString = `${currentHour}:${minute}`;

      onTimeChangeRef.current?.(timeString);
      // Close popover after both are selected
      setOpen(false);
    }
  };

  const hours = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, '0'),
  );
  const minutes = Array.from({ length: 60 }, (_, i) =>
    i.toString().padStart(2, '0'),
  );
  const displayTime = time || (selectedHour && selectedMinute
    ? `${selectedHour}:${selectedMinute}`
    : '');

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !displayTime && 'text-muted-foreground',
            className,
          )}
          disabled={disabled}
        >
          <RbIcon
            name="clock"
            size={12}
            color={IconColors.GRAY_COLOR_ICON}
          />
          {displayTime ? displayTime : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-4"
        align="start"
        onOpenAutoFocus={e => e.preventDefault()}
      >
        <div className="flex gap-2 items-center">
          <Select
            value={selectedHour}
            onValueChange={handleHourChange}
          >
            <SelectTrigger className="w-[80px]">
              <SelectValue placeholder="HH" />
            </SelectTrigger>
            <SelectContent>
              {hours.map(hour => (
                <SelectItem
                  key={hour}
                  value={hour}
                >
                  {hour}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="flex items-center text-lg font-semibold
           text-gray-700"
          >
            :
          </span>
          <Select
            value={selectedMinute}
            onValueChange={handleMinuteChange}
          >
            <SelectTrigger className="w-[80px]">
              <SelectValue placeholder="MM" />
            </SelectTrigger>
            <SelectContent>
              {minutes.map(minute => (
                <SelectItem
                  key={minute}
                  value={minute}
                >
                  {minute}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
}
