import React from 'react';

import { cn } from '@/libs/utils';

interface ModernLoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
  variant?: 'dots' | 'bars' | 'pulse';
}

const ModernLoadingSpinner: React.FC<ModernLoadingSpinnerProps> = ({
  size = 'md',
  text = 'Loading...',
  variant = 'dots',
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };
  const renderDots = () => (
    <div className="flex space-x-2">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className={cn(
            'bg-gradient-to-r from-green-500 to-green-600 rounded-full shadow-lg',
            size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5',
          )}
          style={{
            animation: `bounce 1.4s ease-in-out infinite both`,
            animationDelay: `${i * 0.16}s`,
          }}
        />
      ))}
    </div>
  );
  const renderBars = () => (
    <div className="flex space-x-1">
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          className={cn(
            'bg-green-600 rounded-sm animate-pulse',
            size === 'sm' ? 'w-1 h-4' : size === 'md' ? 'w-1.5 h-6' : 'w-2 h-8',
          )}
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );
  const renderPulse = () => (
    <div className="relative">
      <div
        className={cn(
          'rounded-full bg-green-600 animate-ping',
          sizeClasses[size],
        )}
      />
      <div
        className={cn(
          'absolute inset-0 rounded-full bg-green-600',
          sizeClasses[size],
        )}
      />
    </div>
  );
  const renderSpinner = () => {
    switch (variant) {
      case 'dots':
        return renderDots();
      case 'bars':
        return renderBars();
      case 'pulse':
        return renderPulse();
      default:
        return renderDots();
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

export default ModernLoadingSpinner;
