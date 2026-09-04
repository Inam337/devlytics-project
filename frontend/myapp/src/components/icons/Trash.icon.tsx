import { memo } from 'react';

const TrashIcon = memo(function TrashIcon(props: {
  width?: number;
  height?: number;
  className?: string;
  fill?: string;
}) {
  const { width = 20, height = 20, className = '', fill = '#059669' } = props;

  return (
    <div className={className}>
      <svg
        width={width}
        height={height}
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke={fill}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M3 6h18" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line
          x1="10"
          y1="11"
          x2="10"
          y2="17"
        />
        <line
          x1="14"
          y1="11"
          x2="14"
          y2="17"
        />
      </svg>
    </div>
  );
});

export { TrashIcon };
