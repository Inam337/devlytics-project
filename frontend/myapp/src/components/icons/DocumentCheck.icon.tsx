import { memo } from 'react';

const DocumentCheckIcon = memo(function DocumentCheckIcon(props: {
  width?: number;
  height?: number;
  className?: string;
  fill?: string;
}) {
  const { width = 24, height = 24, className = '', fill = '#004B9C' } = props;

  return (
    <div className={className}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Placeholder: Document with checkmark */}
        <path
          d="M6 2H16L20 6V20C20 21.1 19.1 22 18 22H6C4.9 22 4 21.1 4 20V4C4 2.9 4.9 2 6 2Z"
          stroke={fill}
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M14 2V6H18"
          stroke={fill}
          strokeWidth="2"
        />
        <path
          d="M8 12L10 14L16 8"
          stroke={fill}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
});

export { DocumentCheckIcon };
