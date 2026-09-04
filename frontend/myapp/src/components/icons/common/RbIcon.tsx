import { memo, Suspense } from 'react';

import { iconRegistry } from '@/components/icons/config/icons.registry';
import type { IconKey } from '@/components/icons/config/icons.registry';
import type { RbIconProps } from '@/components/icons/types/RbIcon.types';

const IconFallback = () => (
  <span className="inline-block w-4 h-4 opacity-50" />
);
const extractIconName = (icon?: string): IconKey | undefined => {
  if (!icon) return undefined;

  return icon.replace('rb-', '') as IconKey;
};

const RbIconComponent: React.FC<RbIconProps> = ({
  icon,
  name,
  size = 16,
  className,
  color,
}) => {
  const iconName = name ?? extractIconName(icon);

  if (!iconName) return null;

  const Icon = iconRegistry[iconName];

  if (!Icon) return null;

  return (
    <Suspense fallback={<IconFallback />}>
      <Icon
        width={size}
        height={size}
        fill={color}
        className={className}
      />
    </Suspense>
  );
};

export const RbIcon = memo(RbIconComponent);
RbIcon.displayName = 'RbIcon';
