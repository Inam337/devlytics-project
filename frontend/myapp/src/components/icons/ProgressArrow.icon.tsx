import { memo } from 'react';

const ProgressArrowIcon = memo(function ProgressArrowIcon(props: {
  width?: number;
  height?: number;
  className?: string;
  fill?: string;
}) {
  const { width = 20, height = 20, className = '', fill = '#004B9C' } = props;

  return (
    <div className={className}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M13.3333 5.83333H18.3333V10.8333"
          stroke={fill}
          strokeWidth="1.66667"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M18.3334 5.83333L11.2501 12.9167L7.08341 8.74999L1.66675 14.1667"
          stroke={fill}
          strokeWidth="1.66667"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
});

export { ProgressArrowIcon };
