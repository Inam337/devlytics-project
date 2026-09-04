import { memo } from 'react';

const BuildingDocumentIcon = memo(function BuildingDocumentIcon(props: {
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
        {/* Placeholder: Building with document */}
        <path
          d="M4 20V4C4 2.9 4.9 2 6 2H10C11.1 2 12 2.9 12 4V20"
          stroke={fill}
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M12 20H20C21.1 20 22 19.1 22 18V8C22 6.9 21.1 6 20 6H16"
          stroke={fill}
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M16 6V2H20L22 4"
          stroke={fill}
          strokeWidth="2"
        />
        <path
          d="M7 8H9M7 12H9M7 16H9"
          stroke={fill}
          strokeWidth="2"
        />
      </svg>
    </div>
  );
});

export { BuildingDocumentIcon };
