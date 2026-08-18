import type React from 'react';

export type PageKey = 'dashboard' | 'servers' | 'statistics' | 'settings' | 'account';

export interface SidebarItem {
  key: PageKey;
  label: string;
  icon: React.ReactNode;
}

export interface SidebarProps {
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
}
