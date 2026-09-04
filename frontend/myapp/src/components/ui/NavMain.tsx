import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/Collapsible';
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/Sidebar';
import { RbIcon } from '@/components/icons/common/RbIcon';
import { IconColors } from '@/components/icons/types/RbIcon.types';
import type { MenuItem } from '@/common/MenuData';

export function NavMain({
  items,
}: {
  items: MenuItem[];
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const isRouteActive = (url: string, isParentItem = false): boolean => {
    // Exact match
    if (url === location.pathname) {
      return true;
    }

    // For parent items with nested routes, only match exact URL
    // Don't match if a nested route is active
    if (isParentItem) {
      return url === location.pathname;
    }

    // For nested items, allow exact match only
    return url === location.pathname;
  };

  const hasActiveNestedItem = (item: MenuItem): boolean => {
    if (!item.items || item.items.length === 0) {
      return false;
    }

    return item.items.some(subItem => isRouteActive(subItem.url, false));
  };

  return (
    <SidebarGroup className="px-2">
      <SidebarMenu>
        {items.map((item) => {
          // For parent items with nested routes, only highlight if exact match
          // Don't highlight parent if a nested item is active
          const hasNestedItems = item.items && item.items.length > 0;
          const hasActiveNested = hasActiveNestedItem(item);
          const isActive = hasNestedItems
            ? isRouteActive(item.url, true) && !hasActiveNested
            : isRouteActive(item.url, false);
          const shouldBeOpen = hasActiveNested || isActive;

          if (item.items && item.items.length > 0) {
            return (
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={shouldBeOpen}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger
                    asChild
                  >
                    <SidebarMenuButton
                      tooltip={t(item.title)}
                      isActive={isActive}
                      className="w-full flex items-center justify-between relative"
                    >
                      <div className="flex items-center justify-start gap-2">
                        {item.icon && (
                          <RbIcon
                            name={item.icon}
                            size={item.iconWidth || 20}
                            color={item.iconFill || IconColors.WHITE_COLOR_ICON}
                          />
                        )}
                        <span>{t(item.title)}</span>
                      </div>
                      <RbIcon
                        name="arrowChevronRight"
                        size={18}
                        color={IconColors.WHITE_COLOR_ICON}
                        className="transition-transform duration-200 position-absolute right-0
                        top-3
                        group-data-[state=open]/collapsible:rotate-90"
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map((subItem) => {
                        const isSubItemActive = isRouteActive(subItem.url);

                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isSubItemActive}
                            >
                              <Link to={subItem.url}>
                                <span>{t(subItem.title)}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            );
          }

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={t(item.title)}
                isActive={isActive}
                asChild
              >
                <Link to={item.url}>
                  {item.icon && (
                    <RbIcon
                      name={item.icon}
                      size={item.iconWidth || 20}
                      color={item.iconFill || IconColors.WHITE_COLOR_ICON}
                    />
                  )}
                  <span>{t(item.title)}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
