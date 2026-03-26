import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  sidebarWidth: number;
  commandPaletteOpen: boolean;
  activeWorkspaceId: string | null;
  theme: 'dark' | 'light';
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setActiveWorkspaceId: (id: string | null) => void;
  toggleTheme: () => void;
}

function getInitialTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  return (localStorage.getItem('threatpad-theme') as 'dark' | 'light') || 'dark';
}

function applyTheme(theme: 'dark' | 'light') {
  if (typeof window === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  localStorage.setItem('threatpad-theme', theme);
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  sidebarWidth: 280,
  commandPaletteOpen: false,
  activeWorkspaceId: null,
  theme: getInitialTheme(),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      return { theme: next };
    }),
}));
