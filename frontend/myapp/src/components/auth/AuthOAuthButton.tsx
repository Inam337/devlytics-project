import type { ReactNode } from 'react';

import { cn } from '@/libs/utils';

/**
 * Stub OAuth button — the design shows GitHub/Google/GitLab sign-in, but no
 * OAuth endpoint exists in the current API surface (docs/API_ENDPOINTS.md).
 * Disabled with a "coming soon" title rather than faking a working flow.
 */
export default function AuthOAuthButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      disabled
      title="Coming soon"
      className={cn(
        'flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-lg border',
        'border-[#E2E8F0] bg-white px-[11px] py-2 text-[13px] text-[#241d4d] opacity-60',
      )}
    >
      {children}
    </button>
  );
}

export function AuthOrDivider() {
  return (
    <div className="flex items-center gap-3 text-xs text-[#5C6879]">
      <div className="h-px flex-1 bg-[#E2E8F0]" />
      OR
      <div className="h-px flex-1 bg-[#E2E8F0]" />
    </div>
  );
}
