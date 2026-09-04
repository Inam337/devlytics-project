import { memo } from 'react';

const CircularCheckMarkIcon = memo(function CircularCheckMarkIcon(props: {
  width?: number;
  height?: number;
  className?: string;
  fill?: string;
}) {
  const { width = 48, height = 48, className = '', fill = '#059669' } = props;

  return (
    <div className={className}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M43.6012 20C44.5146 24.4826 43.8637 29.1428 41.7569 33.2036C39.6502 37.2643
          36.215 40.4801 32.0243 42.3146C27.8335 44.1492 23.1405 44.4916 18.7278 43.2847
          C14.3152 42.0779 10.4496 39.3948 7.77577 35.6828C5.10194 31.9709 3.78147 27.4545
          4.03455 22.8868C4.28763 18.3191 6.09898 13.9762 9.16652 10.5823C12.2341 7.1885
          16.3724 4.94886 20.8914 4.2369C25.4103 3.52495 30.0368 4.38371 33.9992 6.66999"
          stroke={fill}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M18 22L24 28L44 8"
          stroke={fill}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
});

export { CircularCheckMarkIcon };
