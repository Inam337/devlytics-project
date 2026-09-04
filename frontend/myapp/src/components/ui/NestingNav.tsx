import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import type { MenuItem } from '@/common/MenuData';
import { ChevronDown } from '@/components/icons/FluentIcons';
import { RbIcon } from '@/components/icons/common/RbIcon';
import { IconColors } from '@/components/icons/types/RbIcon.types';
import { useT } from '@/hooks/use-t';
import { cn } from '@/libs/utils';

type NestingNavProps = {
  items: MenuItem[];
  collapsed: boolean;
  onNavigate?: () => void;
};

function isPathActive(pathname: string, url: string): boolean {
  if (pathname === url) {
    return true;
  }

  if (url !== '/' && pathname.startsWith(`${url}/`)) {
    return true;
  }

  return false;
}

function hasActiveChild(pathname: string, item: MenuItem): boolean {
  return item.items?.some(sub => isPathActive(pathname, sub.url)) ?? false;
}

export function NestingNav({ items, collapsed, onNavigate }: NestingNavProps) {
  const { t } = useT();
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [flyoutKey, setFlyoutKey] = useState<string | null>(null);

  useEffect(() => {
    const next: Record<string, boolean> = {};

    for (const item of items) {
      if (item.items?.length && hasActiveChild(location.pathname, item)) {
        next[item.title] = true;
      }
    }

    setOpenGroups(prev => ({ ...prev, ...next }));
  }, [location.pathname, items]);

  const toggleGroup = (title: string) => {
    setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const linkClass = (active: boolean) =>
    cn(
      'flex items-center rounded-md text-sm transition-colors',
      collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2',
      active ? 'bg-white/15 font-medium' : 'hover:bg-white/10',
    );

  return (
    <nav className={cn('flex flex-col gap-1', collapsed ? 'px-1' : 'px-2')}>
      {items.map((item) => {
        const label = t(item.title, item.title);
        const hasChildren = Boolean(item.items?.length);
        const childActive = hasActiveChild(location.pathname, item);
        const parentActive = isPathActive(location.pathname, item.url) && !childActive;
        const isOpen = openGroups[item.title] ?? childActive;

        if (!hasChildren) {
          return (
            <Link
              key={item.title}
              to={item.url}
              title={collapsed ? label : undefined}
              onClick={onNavigate}
              className={linkClass(isPathActive(location.pathname, item.url))}
            >
              <RbIcon
                name={item.icon}
                size={item.iconWidth ?? 16}
                color={item.iconFill ?? IconColors.WHITE_COLOR_ICON}
              />
              {!collapsed ? <span>{label}</span> : null}
            </Link>
          );
        }

        if (collapsed) {
          return (
            <div
              key={item.title}
              className="relative"
              onMouseLeave={() => setFlyoutKey(null)}
            >
              <button
                type="button"
                title={label}
                onClick={() => setFlyoutKey(prev => (prev === item.title ? null : item.title))}
                className={cn(linkClass(parentActive || childActive), 'w-full')}
              >
                <RbIcon
                  name={item.icon}
                  size={item.iconWidth ?? 16}
                  color={item.iconFill ?? IconColors.WHITE_COLOR_ICON}
                />
              </button>
              {flyoutKey === item.title
                ? (
                    <div
                      className={cn(
                        'absolute left-full top-0 z-50 ml-2 min-w-[180px]',
                        'rounded-md border border-blue-600 bg-[#00529c] py-1 shadow-lg',
                      )}
                    >
                      {item.items?.map(sub => (
                        <Link
                          key={sub.url}
                          to={sub.url}
                          onClick={() => {
                            setFlyoutKey(null);
                            onNavigate?.();
                          }}
                          className={cn(
                            'block px-4 py-2 text-sm hover:bg-white/10',
                            isPathActive(location.pathname, sub.url) && 'bg-white/15 font-medium',
                          )}
                        >
                          {t(sub.title, sub.title)}
                        </Link>
                      ))}
                    </div>
                  )
                : null}
            </div>
          );
        }

        return (
          <div
            key={item.title}
            className="flex flex-col"
          >
            <button
              type="button"
              onClick={() => toggleGroup(item.title)}
              className={cn(
                linkClass(parentActive || childActive),
                'w-full justify-between',
              )}
            >
              <span className="flex items-center gap-3">
                <RbIcon
                  name={item.icon}
                  size={item.iconWidth ?? 16}
                  color={item.iconFill ?? IconColors.WHITE_COLOR_ICON}
                />
                <span>{label}</span>
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 transition-transform',
                  isOpen && 'rotate-180',
                )}
              />
            </button>
            {isOpen
              ? (
                  <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-white/20 pl-3">
                    {item.items?.map(sub => (
                      <Link
                        key={sub.url}
                        to={sub.url}
                        onClick={onNavigate}
                        className={cn(
                          'rounded-md px-3 py-1.5 text-sm hover:bg-white/10',
                          isPathActive(location.pathname, sub.url) && 'bg-white/15 font-medium',
                        )}
                      >
                        {t(sub.title, sub.title)}
                      </Link>
                    ))}
                  </div>
                )
              : null}
          </div>
        );
      })}
    </nav>
  );
}
