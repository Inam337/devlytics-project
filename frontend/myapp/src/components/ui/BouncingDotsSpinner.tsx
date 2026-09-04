import React from 'react';

import { cn } from '@/libs/utils';

interface BouncingDotsSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
  color?: 'green' | 'blue' | 'purple' | 'orange';
}

const BouncingDotsSpinner: React.FC<BouncingDotsSpinnerProps> = ({
  size = 'md',
  className,
  text = 'Loading...',
  color = 'green',
}) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };
  const colorClasses = {
    green: 'from-green-400 to-green-600',
    blue: 'from-blue-400 to-blue-600',
    purple: 'from-purple-400 to-purple-600',
    orange: 'from-orange-400 to-orange-600',
  };
  const shadowClasses = {
    green: 'shadow-green-200',
    blue: 'shadow-blue-200',
    purple: 'shadow-purple-200',
    orange: 'shadow-orange-200',
  };

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="flex space-x-2">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className={cn(
                  'rounded-full bg-gradient-to-r shadow-lg',
                  colorClasses[color],
                  shadowClasses[color],
                  sizeClasses[size],
                  className,
                )}
                style={{
                  animation: `bounce 1.4s ease-in-out infinite both`,
                  animationDelay: `${i * 0.16}s`,
                  transform: 'translateY(0)',
                }}
              />
            ))}
          </div>
        </div>
        <p
          className="text-gray-600 text-sm font-medium animate-pulse"
          aria-live="polite"
        >
          {text}
        </p>
      </div>
    </div>
  );
};

export default BouncingDotsSpinner;
