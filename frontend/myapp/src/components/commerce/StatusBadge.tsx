import { cn } from '@/libs/utils';

type StatusBadgeProps = {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
};

const toneClasses: Record<NonNullable<StatusBadgeProps['tone']>, string> = {
  neutral: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
};

export default function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        toneClasses[tone],
      )}
    >
      {label}
    </span>
  );
}
