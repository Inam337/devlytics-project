import React from 'react';

import { cn } from '@/libs/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
  text = 'Loading...',
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-12 w-12 border-4',
    lg: 'h-16 w-16 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className={cn(
          'animate-spin rounded-full border-gray-300 border-t-primary',
          sizeClasses[size],
          className,
        )}
        role="status"
        aria-label="Loading"
      />
      {text && (
        <p
          className="text-gray-600 text-sm font-medium mt-4"
          aria-live="polite"
        >
          {text}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
