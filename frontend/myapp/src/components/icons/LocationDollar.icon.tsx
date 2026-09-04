import { memo } from 'react';

const LocationDollarIcon = memo(function LocationDollarIcon(props: {
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
        {/* Placeholder: Location pin with dollar sign */}
        <circle
          cx="12"
          cy="10"
          r="6"
          stroke={fill}
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M12 4V16M9 7H15M9 13H15"
          stroke={fill}
          strokeWidth="2"
        />
        <path
          d="M12 18L12 20"
          stroke={fill}
          strokeWidth="2"
        />
      </svg>
    </div>
  );
});

export { LocationDollarIcon };
