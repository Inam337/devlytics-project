import { memo } from 'react';

const GlobePersonIcon = memo(function GlobePersonIcon(props: {
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
        {/* Placeholder: Globe with person */}
        <circle
          cx="12"
          cy="12"
          r="8"
          stroke={fill}
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M2 12H22M12 2C14 4 16 8 16 12C16 16 14 20 12 22C10 20 8 16 8 12C8 8 10 4 12 2Z"
          stroke={fill}
          strokeWidth="2"
        />
        <circle
          cx="12"
          cy="12"
          r="3"
          stroke={fill}
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M12 9V15M9 12H15"
          stroke={fill}
          strokeWidth="2"
        />
      </svg>
    </div>
  );
});

export { GlobePersonIcon };
