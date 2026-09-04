import { memo } from 'react';

const PrinterIcon = memo(function PrinterIcon(props: {
  width?: number;
  height?: number;
  className?: string;
  fill?: string;
}) {
  const { width = 20, height = 20, className = '', fill = '#FFFFFF' } = props;

  return (
    <div className={className}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g clipPath="url(#clip0_605_13622)">
          <path
            d="M5 6.25V3.125H15V6.25"
            stroke={fill}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M15 11.875H5V16.875H15V11.875Z"
            stroke={fill}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5 13.75H1.875V7.5C1.875 6.80937 2.48125 6.25 3.22891 6.25H16.7711
            C17.5187 6.25 18.125 6.80937 18.125 7.5V13.75H15"
            stroke={fill}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M14.6875 10C15.2053 10 15.625 9.58027 15.625 9.0625C15.625 8.54473
            15.2053 8.125 14.6875 8.125C14.1697 8.125 13.75 8.54473 13.75 9.0625
            C13.75 9.58027 14.1697 10 14.6875 10Z"
            fill={fill}
          />
        </g>
      </svg>
    </div>
  );
});

export { PrinterIcon };
