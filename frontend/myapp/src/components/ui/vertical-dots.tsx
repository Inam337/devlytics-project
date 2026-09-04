import React from 'react';

interface VerticalDotsProps {
  'color'?: string;
  'size'?: number;
  'className'?: string;
  'aria-label'?: string;
}

const VerticalDots: React.FC<VerticalDotsProps> = ({
  color = 'bg-primary',
  size = 24,
  className = '',
  'aria-label': ariaLabel = 'More options',
}) => {
  const dotSize = Math.round(size / 4);

  return (
    <span
      className="flex flex-col items-center justify-center"
      style={{ width: size, height: size }}
      aria-label={ariaLabel}
      role="img"
    >
      <span
        className={`block rounded-full mb-0.5 ${color} ${className}`}
        style={{ width: dotSize, height: dotSize }}
      >
      </span>
      <span
        className={`block rounded-full mb-0.5 ${color} ${className}`}
        style={{ width: dotSize, height: dotSize }}
      >
      </span>
      <span
        className={`block rounded-full ${color} ${className}`}
        style={{ width: dotSize, height: dotSize }}
      >
      </span>
    </span>
  );
};

export default VerticalDots;
