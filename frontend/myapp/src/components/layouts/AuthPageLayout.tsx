import type { ReactNode } from 'react';

import { loginBg } from '@/assets';
import LanguageSwitcher from '@/components/layouts/LanguageSwitcher';
import { BrandLogo } from '@/components/ui/BrandLogo';

type AuthPageLayoutProps = {
  children: ReactNode;
};

export default function AuthPageLayout({ children }: AuthPageLayoutProps) {
  return (
    <div className="relative min-h-screen">
      <img
        src={loginBg}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="absolute inset-0 bg-black/15"
        aria-hidden
      />
      <div className="absolute end-4 top-4 z-20">
        <LanguageSwitcher />
      </div>
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="flex w-full max-w-md flex-col items-center gap-6">
          <BrandLogo
            variant="color"
            className="h-12 max-w-[14rem]"
          />
          {children}
        </div>
      </div>
    </div>
  );
}
