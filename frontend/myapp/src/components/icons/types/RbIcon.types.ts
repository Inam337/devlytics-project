import type { IconKey } from '@/components/icons/config/icons.registry';

/**
 * Props for the RbIcon component
 */
export interface RbIconProps {
  /** Icon name with 'rb-' prefix (e.g., 'rb-home') */
  icon?: `rb-${string}`;
  /** Icon key from the registry (e.g., 'home') */
  name?: IconKey;
  /** Icon size in pixels (applied to both width and height) */
  size?: number;
  /** Additional CSS classes */
  className?: string;
  /** Icon fill color */
  color?: string;
}
export const IconColors = {
  WHITE_COLOR_ICON: '#FFFFFF',
  GRAY_COLOR_ICON: '#9CA3AF',
  PRIMARY_COLOR_ICON: '#00529c',
  ORANGE_COLOR_ICON: '#FFA500',
  HAM_BURGER_ARROW: '#FFFFFF',
  BLACK_COLOR_ICON: '#111827',
  RED_COLOR_ICON: '#F23030',
  WARNING_COLOR_ICON: '#fdbc00',
  BLUE_COLOR_ICON: '#103F91',
  PURPLE_COLOR_ICON: '#8B5CF6',
  YELLOW_COLOR_ICON: '#FBBF24',
  GREEN_COLOR_ICON: '#10B981',
} as const;
