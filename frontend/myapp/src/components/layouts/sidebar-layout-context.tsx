import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useIsMobile } from '@/hooks/use-mobile';

type SidebarLayoutContextValue = {
  collapsed: boolean;
  toggleCollapsed: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  isMobile: boolean;
};

const SidebarLayoutContext = createContext<SidebarLayoutContextValue | null>(null);

export function SidebarLayoutProvider({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => !prev);
  }, []);  const value = useMemo(
    () => ({
      collapsed: isMobile ? false : collapsed,
      toggleCollapsed,
      mobileOpen,
      setMobileOpen,
      isMobile,
    }),
    [collapsed, isMobile, mobileOpen, toggleCollapsed],
  );

  return (
    <SidebarLayoutContext.Provider value={value}>
      {children}
    </SidebarLayoutContext.Provider>
  );
}

export function useSidebarLayout(): SidebarLayoutContextValue {
  const context = useContext(SidebarLayoutContext);

  if (!context) {
    throw new Error('useSidebarLayout must be used within SidebarLayoutProvider');
  }

  return context;
}
