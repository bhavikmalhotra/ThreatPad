import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  sidebarWidth: number;
  commandPaletteOpen: boolean;
  activeWorkspaceId: string | null;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setActiveWorkspaceId: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  sidebarWidth: 280,
  commandPaletteOpen: false,
  activeWorkspaceId: null,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),
}));
