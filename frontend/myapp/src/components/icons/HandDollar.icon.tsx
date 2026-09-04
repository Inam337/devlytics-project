import { memo } from 'react';

const HandDollarIcon = memo(function HandDollarIcon(props: {
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
        {/* Placeholder: Hand holding dollar sign */}
        <path
          d="M8 12L6 14L8 16L10 14L8 12Z"
          stroke={fill}
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M12 8V16M9 11H15M9 13H15"
          stroke={fill}
          strokeWidth="2"
        />
        <path
          d="M16 8L18 6L20 8L18 10L16 8Z"
          stroke={fill}
          strokeWidth="2"
          fill="none"
        />
      </svg>
    </div>
  );
});

export { HandDollarIcon };
