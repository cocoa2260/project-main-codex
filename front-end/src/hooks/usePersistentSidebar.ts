import { useEffect, useState } from 'react';

const STORAGE_KEY = 'user-ui-sidebar-collapsed';

function getInitialSidebarOpen() {
  if (typeof window === 'undefined') return true;

  return window.localStorage.getItem(STORAGE_KEY) !== 'true';
}

export function usePersistentSidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(getInitialSidebarOpen);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, sidebarOpen ? 'false' : 'true');
  }, [sidebarOpen]);

  return [sidebarOpen, setSidebarOpen] as const;
}
