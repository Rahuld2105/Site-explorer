import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const SIDEBAR_STORAGE_KEY = 'tourvision_sidebar_collapsed';

/**
 * Centralizes sidebar UI state for desktop collapse and mobile drawer behavior.
 */
export default function useSidebar() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsMobileOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  return {
    isCollapsed,
    isMobileOpen,
    openMobileSidebar: () => setIsMobileOpen(true),
    closeMobileSidebar: () => setIsMobileOpen(false),
    toggleCollapse: () => setIsCollapsed((current) => !current),
    toggleMobileSidebar: () => setIsMobileOpen((current) => !current)
  };
}
