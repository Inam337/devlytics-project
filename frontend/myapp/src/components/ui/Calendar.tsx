import * as React from 'react';
import { DayPicker, getDefaultClassNames } from 'react-day-picker';

import 'react-day-picker/style.css';
import { RbIcon } from '@/components/icons/common/RbIcon';
import { IconColors } from '@/components/icons/types/RbIcon.types';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ ...props }: CalendarProps) {
  const defaultClassNames = getDefaultClassNames();
  const ICON_SIZE = 22;

  return (
    <DayPicker
      animate
      mode="single"
      {...props}
      classNames={{
        today: `border-primary`, // Add a border to today's date
        selected: `bg-primary text-white`, // Highlight the selected day
        root: `${defaultClassNames.root} shadow-lg p-2`,
        chevron: `${defaultClassNames.chevron}`, // Change the color of the chevron
        day: `${defaultClassNames.day} 
        hover:bg-gray-200 hover:text-black cursor-pointer`,
        // Add hover effects// Add a shadow to the root element
      }}
      components={{
        Chevron: ({ orientation }) => {
          if (orientation === 'left') {
            return (
              <RbIcon
                name="arrowChevronLeft"
                size={ICON_SIZE}
                color={IconColors.PRIMARY_COLOR_ICON}
              />
            );
          }

          if (orientation === 'right') {
            return (
              <RbIcon
                name="arrowChevronRight"
                size={ICON_SIZE}
                color={IconColors.PRIMARY_COLOR_ICON}
              />
            );
          }

          return (
            <span
              style={{ display: 'none' }}
              aria-hidden="true"
            />
          );
        },
      }}
    />
  );
}

Calendar.displayName = 'Calendar';

export { Calendar };
