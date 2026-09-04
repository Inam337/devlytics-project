import React from 'react';

import { cn } from '@/libs/utils';

interface SuspenseLoadingProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

const SuspenseLoading: React.FC<SuspenseLoadingProps> = ({
  size = 'md',
  className,
  text,
}) => {
  const barSizeClasses = {
    sm: { width: 'w-12', height: 'h-1' },
    md: { width: 'w-16', height: 'h-1.5' },
    lg: { width: 'w-24', height: 'h-2' },
  };
  const barSize = barSizeClasses[size];

  return (
    <div className={cn(
      'w-full fixed z-50 left-0 top-0 flex items-center justify-center h-screen flex-col',
      'bg-zentro-beige/60 backdrop-blur-[2px]',
      className,
    )}
    >
      <div className="flex flex-col items-center justify-center text-center">
        {/* Bouncing Circle */}
        <div className="mb-4 flex gap-1">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: 'var(--zentro-teal)',
              animation: 'bounce-circle 1.4s ease-in-out infinite',
              animationDelay: '0s',
            }}
          />
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: 'var(--zentro-mint)',
              animation: 'bounce-circle 1.4s ease-in-out infinite',
              animationDelay: '0.2s',
            }}
          />
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: 'var(--zentro-teal)',
              animation: 'bounce-circle 1.4s ease-in-out infinite',
              animationDelay: '0.4s',
            }}
          />
        </div>
        {/* Loading Bar */}
        <div
          className={cn(
            'relative overflow-hidden rounded-full bg-zentro-mint/30',
            barSize.width,
            barSize.height,
          )}
          role="status"
          aria-label="Loading"
        >
          <div
            className={cn('absolute h-full rounded-full', barSize.height)}
            style={{
              background: `linear-gradient(
                90deg,
                transparent 0%,
                var(--zentro-teal) 35%,
                var(--zentro-mint) 65%,
                transparent 100%
              )`,
              width: '50%',
              animation: 'loading-bar-infinite 1.5s linear infinite',
            }}
          />
        </div>
      </div>
      {text && (
        <p
          className="text-foreground text-center text-sm font-medium
            mt-4"
          aria-live="polite"
        >
          {text}
        </p>
      )}
      {!text && (
        <p
          className="text-foreground text-center text-sm font-medium
            mt-4"
          aria-live="polite"
        >
          Loading...
        </p>
      )}
      <style>
        {`
        @keyframes bounce-circle {
          0%, 80%, 100% {
            transform: translateY(0);
            opacity: 0.7;
          }
          40% {
            transform: translateY(-10px);
            opacity: 1;
          }
        }
        @keyframes loading-bar-infinite {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
      `}
      </style>
    </div>
  );
};

export default SuspenseLoading;
