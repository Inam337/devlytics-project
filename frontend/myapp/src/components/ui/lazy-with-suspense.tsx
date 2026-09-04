import {
  Suspense,
  type ComponentType,
  type LazyExoticComponent,
  type ReactNode,
} from 'react';

import SuspenseLoading from '@/components/ui/SuspenseLoading';

type SuspenseOptions = {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
};

export function lazyWithSuspense<P extends object>(
  Lazy: LazyExoticComponent<ComponentType<P>>,
  options?: SuspenseOptions,
): ComponentType<P> {
  function SuspenseWrapped(props: P) {
    const fallback: ReactNode = (
      <SuspenseLoading
        size={options?.size ?? 'sm'}
        text={options?.text}
      />
    );

    return (
      <Suspense fallback={fallback}>
        <Lazy {...props} />
      </Suspense>
    );
  }

  return SuspenseWrapped;
}
