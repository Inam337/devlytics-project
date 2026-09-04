import { memo } from 'react';

const BulletMenuIcon = memo(function BulletMenuIcon(props: {
  width?: number;
  height?: number;
  className?: string;
  fill?: string;
}) {
  const { width = 16, height = 16, className = '', fill = '#111928' } = props;

  return (
    <div className={className}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M2 3.33334H2.00667"
          stroke={fill}
          strokeWidth="1.33333"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M2 8H2.00667"
          stroke={fill}
          strokeWidth="1.33333"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M2 12.6667H2.00667"
          stroke={fill}
          strokeWidth="1.33333"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5.33398 3.33334H14.0007"
          stroke={fill}
          strokeWidth="1.33333"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5.33398 8H14.0007"
          stroke={fill}
          strokeWidth="1.33333"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5.33398 12.6667H14.0007"
          stroke={fill}
          strokeWidth="1.33333"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
});

export { BulletMenuIcon };
