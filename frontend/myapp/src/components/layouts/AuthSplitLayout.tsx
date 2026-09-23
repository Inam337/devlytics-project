import type { ReactNode } from 'react';

type AuthSplitLayoutProps = {
  /** Minimum column width before the grid stacks to a single column (design: 460 for login, 540 for register) */
  minColumnWidth?: number;
  /** Left/right column padding (design: '48px 64px' for login, '56px 56px' for register) */
  padding?: string;
  left: ReactNode;
  right: ReactNode;
};

/**
 * Two-column auth shell: white form column + gradient marketing panel.
 * Pixel-accurate to Devlytics.dc.html's `at.login`/`at.register` states.
 */
export default function AuthSplitLayout({
  minColumnWidth = 460,
  padding = '48px 64px',
  left,
  right,
}: AuthSplitLayoutProps) {
  return (
    <div
      className="h-screen overflow-hidden"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${minColumnWidth}px, 1fr))`,
      }}
    >
      <div
        className="flex min-w-0 flex-col justify-center overflow-y-auto bg-white"
        style={{ padding }}
      >
        {left}
      </div>
      <div
        className="flex min-w-0 flex-col justify-center overflow-y-auto"
        style={{
          padding,
          background: 'linear-gradient(160deg,#0B7D9E 0%,#2E6E8E 46%,#372b73 100%)',
        }}
      >
        {right}
      </div>
    </div>
  );
}
