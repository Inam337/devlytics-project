import type { ReactNode } from 'react';

import Card from '@/components/ui/Card';
import { cn } from '@/libs/utils';

type AuthFormLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export default function AuthFormLayout({
  title,
  subtitle,
  children,
  footer,
}: AuthFormLayoutProps) {
  return (
    <Card
      className={cn(
        'w-full px-6 py-6',
        'border border-white/20 bg-white/95 shadow-xl backdrop-blur-sm',
      )}
    >
      <header className="mb-4 text-center">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {subtitle
          ? (
              <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
            )
          : null}
      </header>
      <Card.Body>{children}</Card.Body>
      {footer
        ? (
            <Card.Footer>
              <div className="flex flex-col gap-2">{footer}</div>
            </Card.Footer>
          )
        : null}
    </Card>
  );
}
