import React from 'react';

import { cn } from '@/libs/utils';

interface AdvancedBouncingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
  variant?: 'dots' | 'circles' | 'squares';
}

const AdvancedBouncingSpinner: React.FC<AdvancedBouncingSpinnerProps> = ({
  size = 'md',
  className,
  text = 'Loading...',
  variant = 'dots',
}) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };
  const renderBouncingDots = () => (
    <div className="flex space-x-3">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className={cn(
            'bg-gradient-to-br from-green-400 via-green-500 to-green-600 rounded-full shadow-lg',
            sizeClasses[size],
            className,
          )}
          style={{
            animation: `bounce 1.4s ease-in-out infinite both`,
            animationDelay: `${i * 0.2}s`,
            transform: 'translateY(0)',
          }}
        />
      ))}
    </div>
  );
  const renderBouncingCircles = () => (
    <div className="flex space-x-2">
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          className={cn(
            'bg-gradient-to-r from-green-500 to-green-600 rounded-full border-2',
            'border-green-300 shadow-md',
            size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6',
            className,
          )}
          style={{
            animation: `bounce 1.2s ease-in-out infinite both`,
            animationDelay: `${i * 0.15}s`,
            transform: 'translateY(0)',
          }}
        />
      ))}
    </div>
  );
  const renderBouncingSquares = () => (
    <div className="flex space-x-2">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className={cn(
            'bg-gradient-to-br from-green-400 to-green-600 rounded-md shadow-lg',
            size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5',
            className,
          )}
          style={{
            animation: `bounce 1.6s ease-in-out infinite both`,
            animationDelay: `${i * 0.25}s`,
            transform: 'translateY(0)',
          }}
        />
      ))}
    </div>
  );
  const renderSpinner = () => {
    switch (variant) {
      case 'dots':
        return renderBouncingDots();
      case 'circles':
        return renderBouncingCircles();
      case 'squares':
        return renderBouncingSquares();
      default:
        return renderBouncingDots();
    }
  };

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          {renderSpinner()}
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

export default AdvancedBouncingSpinner;
