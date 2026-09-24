'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { storeSidebarPreference } from '@/lib/shell/sidebar-preference';

interface ShellContextValue {
  /** The phone/tablet navigation drawer. */
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  /** The desktop sidebar: collapsed to icons, or full width. */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  /** Global search (Ctrl+K). */
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
}

const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell(): ShellContextValue {
  const context = useContext(ShellContext);
  if (!context) throw new Error('useShell must be used inside <AdminShell>.');
  return context;
}

export interface ShellProviderProps {
  children: ReactNode;
  /** Read from the cookie on the server, so the first render is already correct. */
  initialSidebarCollapsed: boolean;
}

export function ShellProvider({
  children,
  initialSidebarCollapsed,
}: ShellProviderProps): ReactNode {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(initialSidebarCollapsed);
  const [searchOpen, setSearchOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((current) => {
      const next = !current;
      storeSidebarPreference(next);
      return next;
    });
  }, []);

  // Growing the window past the desktop breakpoint hides the drawer; close it
  // too, so it doesn't reappear when the window shrinks again.
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    function handleChange(event: MediaQueryListEvent): void {
      if (event.matches) setMobileNavOpen(false);
    }
    desktop.addEventListener('change', handleChange);
    return () => desktop.removeEventListener('change', handleChange);
  }, []);

  // Ctrl+B collapses the sidebar and Ctrl+K opens search (Cmd on a Mac) —
  // the shortcuts people already know from editors and other admin tools.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      const withModifier = event.ctrlKey || event.metaKey;
      if (!withModifier || event.shiftKey) return;
      if (event.key.toLowerCase() === 'b') {
        event.preventDefault();
        toggleSidebar();
      } else if (event.key.toLowerCase() === 'k') {
        event.preventDefault();
        // Focus the search button first, so closing the dialog returns focus
        // there rather than to the top of the page.
        const triggers = [...document.querySelectorAll<HTMLElement>('[data-search-trigger]')];
        triggers.find((element) => element.offsetParent !== null)?.focus();
        setSearchOpen(true);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  const value = useMemo(
    () => ({
      mobileNavOpen,
      setMobileNavOpen,
      sidebarCollapsed,
      toggleSidebar,
      searchOpen,
      setSearchOpen,
    }),
    [mobileNavOpen, sidebarCollapsed, toggleSidebar, searchOpen],
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}
