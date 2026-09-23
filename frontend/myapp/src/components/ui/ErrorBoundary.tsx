import { useState, useEffect } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

import { RbIcon } from '@/components/icons/common/RbIcon';
import { IconColors } from '@/components/icons/types/RbIcon.types';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Button } from '@/components/ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

// Function-based error boundary component
function ErrorBoundary({ children, fallback }: Props) {
  const [errorState, setErrorState] = useState<ErrorState>({ hasError: false });

  // Handle errors using useEffect and error event listeners
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      const errorInfo: ErrorInfo = {
        componentStack: error.error?.stack || '',
      };

      setErrorState({
        hasError: true,
        error: error.error || new Error(error.message),
        errorInfo,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('ErrorBoundary caught an unhandled rejection:', event);

      const errorInfo: ErrorInfo = {
        componentStack: event.reason?.stack || '',
      };

      setErrorState({
        hasError: true,
        error: event.reason || new Error('Unhandled Promise Rejection'),
        errorInfo,
      });
    };

    // Add global error listeners
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup listeners on unmount
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const handleRetry = () => {
    setErrorState({ hasError: false });
  };

  const WRONG_THING_ICON_SIZE = 32;

  if (errorState.hasError) {
    return fallback || (
      <div className="w-full flex flex-col items-center justify-center h-screen">
        <div className="sm:max-w-72 lg:max-w-96 mx-auto flex-col items-center
         justify-center bg-white p-8 rounded-sm"
        >
          <div className="relative mx-auto mb-4 flex h-12 items-center justify-center">
            <BrandLogo variant="color" />
          </div>

          <div className="w-full flex-col flex items-center justify-center text-center">
            <div className="w-full flex-col flex items-center justify-center">
              <div className="mx-auto mb-4 w-18 h-18 bg-gray-200 rounded-sm
              flex items-center justify-center"
              >
                <RbIcon
                  name="warning"
                  size={WRONG_THING_ICON_SIZE}
                  color={IconColors.GRAY_COLOR_ICON}
                />
              </div>

              <h2 className="text-lg font-semibold text-red-600 mb-2">
                Oops! something went wrong
              </h2>
              <p className="text-gray-500 mb-4">
                {errorState.error?.message || 'An unexpected error occurred'}
              </p>
              <Button
                variant="default"
                onClick={handleRetry}
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default ErrorBoundary;
