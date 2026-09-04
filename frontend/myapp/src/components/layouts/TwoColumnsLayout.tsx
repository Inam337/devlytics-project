import type { ReactNode } from 'react';

// import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface TwoColumnsLayoutProps {
  children: ReactNode;
  leftChildren?: ReactNode;
}

export default function TwoColumnsLayout({
  children,
  leftChildren,
}: TwoColumnsLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Column - Children Content */}
      {leftChildren && (
        <div className="hidden lg:flex lg:w-1/2">
          {leftChildren}
        </div>
      )}

      {/* Right Column - Children Content */}
      <div
        className="flex-1 flex items-center justify-center bg-white
        text-foreground p-4 sm:p-6 lg:p-8 lg:w-1/2 min-h-screen relative"
      >
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
          {/* <ThemeToggle /> */}
        </div>
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
