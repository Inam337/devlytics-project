import React from 'react';

import LanguageSwitcher from '@/components/layouts/LanguageSwitcher';

interface LayoutCenterProps {
  children: React.ReactNode;
}

export default function LayoutCenter({ children }: LayoutCenterProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-page-gradient p-4">
      <div className="absolute top-4 end-4">
        <LanguageSwitcher />
      </div>
      {children}
    </div>
  );
}
