import { memo } from 'react';

const FingerPrintIcon = memo(function FingerPrintIcon(props: {
  width?: number;
  height?: number;
  className?: string;
  fill?: string;
}) {
  const { width = 24, height = 24, className = '', fill = '#3B82F6' } = props;

  return (
    <div className={className}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g clipPath="url(#clip0_682_8605)">
          <path
            d="M3.96094 14.4469C4.6472 13.0651 5.00317 11.5428 5.00078 10C4.99946 9.24981
            5.16737 8.50898 5.492 7.83266C5.81664 7.15634 6.28963 6.56196 6.87578 6.09375"
            stroke={fill}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10 10C10.0037 12.542 9.35832 15.0429 8.125 17.2656"
            stroke={fill}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7.5 10C7.5 9.33696 7.76339 8.70107 8.23223 8.23223C8.70107 7.76339 9.33696 7.5
            10 7.5C10.663 7.5 11.2989 7.76339 11.7678 8.23223C12.2366 8.70107 12.5 9.33696 12.5
            10C12.5036 12.577 11.9358 15.1227 10.8375 17.4539"
            stroke={fill}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M17.0746 14.375C17.358 12.9339 17.5004 11.4687 17.4996 10C17.4996 8.01088 16.7094
            6.10322 15.3029 4.6967C13.8964 3.29018 11.9887 2.5 9.99961 2.5C8.01049 2.5 6.10283
            3.29018 4.69631 4.6967C3.28979 6.10322 2.49961 8.01088 2.49961 10C2.50042 10.8516
             2.3559 11.697 2.07227 12.5"
            stroke={fill}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7.25156 12.5C6.98462 13.8141 6.50655 15.0763 5.83594 16.2375"
            stroke={fill}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9.375 5.03901C9.58237 5.0136 9.79108 5.00082 10 5.00073C11.3261 5.00073
            12.5979 5.52752 13.5355 6.4652C14.4732 7.40288 15 8.67465 15 10.0007C14.9994
            10.8365 14.9472 11.6714 14.8438 12.5007"
            stroke={fill}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M14.3695 15C14.2508 15.4625 14.1159 15.9182 13.9648 16.3672"
            stroke={fill}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <defs>
          <clipPath id="clip0_682_8605">
            <rect
              width="20"
              height="20"
              fill="white"
            />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
});

export { FingerPrintIcon };
