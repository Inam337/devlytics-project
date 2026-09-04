import { memo } from 'react';

const DollarSignIcon = memo(function DollarSignIcon(props: {
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
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Placeholder: Dollar sign */}
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke={fill}
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M12 6V18M9 9H12C13.1 9 14 9.9 14 11C14 12.1 13.1 13 12 13H9M15
          15H12C10.9 15 10 14.1 10 13C10 11.9 10.9 11 12 11H15"
          stroke={fill}
          strokeWidth="2"
        />
      </svg>
    </div>
  );
});

export { DollarSignIcon };
