import type { IconKey } from '@/components/icons/config/icons.registry';

export interface RbIconProps {
  icon?: `rb-${string}`; // rb-home
  name?: IconKey; // home
  size?: number;
  className?: string;
  color?: string;
}
