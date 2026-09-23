import { RbIcon } from '@/components/icons/common/RbIcon';
import { IconColors } from '@/components/icons/types/RbIcon.types';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { cn } from '@/libs/utils';

type AuthValue = {
  icon: 'world' | 'graph' | 'refresh' | 'controlsPanel';
  title: string;
  desc: string;
};

const CORE_VALUES: AuthValue[] = [
  {
    icon: 'world',
    title: 'Read-only, always',
    desc: 'We connect to GitHub and GitLab read-only. Your source code never leaves your environment.',
  },
  {
    icon: 'graph',
    title: 'Evidence, not opinion',
    desc: 'Every score traces back to a measured fact — never a guess.',
  },
  {
    icon: 'refresh',
    title: 'Proven by re-analysis',
    desc: 'Goals and experiments complete only when a fresh analysis confirms it — never a checkbox.',
  },
  {
    icon: 'controlsPanel',
    title: 'Weights you control',
    desc: 'Scoring is transparent and configurable. Nothing is a black box.',
  },
];

type AuthValuesPanelProps = {
  eyebrow: string;
  headline: string;
};

/**
 * Animated right-panel showcase — reused across every auth screen (Login,
 * Register, Forgot/Reset password, Accept invitation) so the "core values"
 * story stays consistent regardless of which form is on the left.
 */
export default function AuthValuesPanel({ eyebrow, headline }: AuthValuesPanelProps) {
  return (
    <div className="relative min-w-0 overflow-hidden">
      {/* Decorative drifting glows — purely ambient, sits behind the content */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/[.08] blur-3xl"
        style={{ animation: 'auth-glow-drift 9s ease-in-out infinite' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-[#9FD4E4]/[.10] blur-3xl"
        style={{ animation: 'auth-glow-drift-alt 11s ease-in-out infinite' }}
      />

      <div className="relative z-10">
        <div
          className="mb-4 flex justify-start"
          style={{ animation: 'auth-value-fade-up .5s ease-out backwards' }}
        >
          <BrandLogo
            variant="white"
            className="h-9"
          />
        </div>
        <div
          className="uppercase text-[#9FD4E4]"
          style={{
            font: '500 11px/1 \'IBM Plex Mono\', monospace',
            letterSpacing: '.12em',
            animation: 'auth-value-fade-up .5s ease-out .05s backwards',
          }}
        >
          {eyebrow}
        </div>
        <div
          className="mt-2 max-w-[420px] text-white"
          style={{
            font: '600 22px/1.3 \'IBM Plex Sans\'',
            letterSpacing: '-0.02em',
            animation: 'auth-value-fade-up .5s ease-out .1s backwards',
          }}
        >
          {headline}
        </div>

        <div className="mt-5 flex max-w-[440px] flex-col gap-3">
          {CORE_VALUES.map((value, i) => (
            <div
              key={value.title}
              className="flex items-start gap-3 rounded-xl border border-white/[.12] bg-white/[.06] p-3"
              style={{ animation: `auth-value-fade-up .5s ease-out ${0.15 + i * 0.09}s backwards` }}
            >
              <div
                className={cn(
                  'flex h-9 w-9 flex-none items-center justify-center rounded-lg border',
                  'border-white/25 bg-white/[.12]',
                )}
                style={{ animation: `auth-value-float ${3 + i * 0.4}s ease-in-out ${i * 0.3}s infinite` }}
              >
                <RbIcon
                  name={value.icon}
                  size={17}
                  color={IconColors.WHITE_COLOR_ICON}
                />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-white">{value.title}</div>
                <div className="mt-0.5 text-[11.5px] leading-[1.4] text-[#E4DBF3]">{value.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
