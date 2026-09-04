import { memo } from 'react';

const InProgressApplicationIcon = memo(function InProgressApplicationIcon(props: {
  width?: number;
  height?: number;
  className?: string;
  fill?: string;
}) {
  const { width = 20, height = 20, className = '', fill = '' } = props;

  return (
    <div className={className}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g clipPath="url(#clip0_1487_21436)">
          <path
            d="M15 28H25C25.2652 28 25.5196 27.8946 25.7071 27.7071C25.8946 27.5196
                  26 27.2652 26 27V11L19 4H7C6.73478 4 6.48043 4.10536 6.29289
                  4.29289C6.10536 4.48043 6 4.73478 6 5V14"
            stroke={fill}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M11 26C13.7614 26 16 23.7614 16 21C16 18.2386 13.7614 16 11 16C8.23858
      16 6 18.2386 6 21C6 23.7614 8.23858 26 11 26Z"
            stroke={fill}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M11 19V20.75H12.75"
            stroke={fill}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M19 4V11H26"
            stroke={fill}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
  );
});

export { InProgressApplicationIcon };
