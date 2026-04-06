'use client';

import { useEffect } from 'react';
import { Command } from 'cmdk';
import {
  FileText,
  FolderPlus,
  Search,
  Settings,
  Moon,
  Sun,
  LogOut,
  PenTool,
} from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';

interface CommandPaletteProps {
  onCreateNote: () => void;
  onCreateDrawing: () => void;
  onCreateFolder: () => void;
  onNavigateSettings: () => void;
  onToggleTheme: () => void;
  onLogout: () => void;
  onSearch: (query: string) => void;
}

export function CommandPalette({
  onCreateNote,
  onCreateDrawing,
  onCreateFolder,
  onNavigateSettings,
  onToggleTheme,
  onLogout,
  onSearch,
}: CommandPaletteProps) {
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => setCommandPaletteOpen(false)}
      />
      <div className="fixed left-1/2 top-[20%] w-full max-w-lg -translate-x-1/2">
        <Command className="rounded-lg border border-border bg-card shadow-2xl">
          <Command.Input
            placeholder="Type a command or search..."
            className="h-12 w-full border-b border-border bg-transparent px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none"
            onValueChange={(value) => {
              if (value.length > 2) onSearch(value);
            }}
          />
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            <Command.Group heading="Actions" className="text-xs text-muted-foreground px-2 py-1.5">
              <Command.Item
                className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-accent aria-selected:bg-accent"
                onSelect={() => {
                  onCreateNote();
                  setCommandPaletteOpen(false);
                }}
              >
                <FileText className="h-4 w-4" />
                New Note
              </Command.Item>
              <Command.Item
                className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-accent aria-selected:bg-accent"
                onSelect={() => {
                  onCreateDrawing();
                  setCommandPaletteOpen(false);
                }}
              >
                <PenTool className="h-4 w-4" />
                New Drawing
              </Command.Item>
              <Command.Item
                className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-accent aria-selected:bg-accent"
                onSelect={() => {
                  onCreateFolder();
                  setCommandPaletteOpen(false);
                }}
              >
                <FolderPlus className="h-4 w-4" />
                New Folder
              </Command.Item>
              <Command.Item
                className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-accent aria-selected:bg-accent"
                onSelect={() => {
                  setCommandPaletteOpen(false);
                }}
              >
                <Search className="h-4 w-4" />
                Search Notes
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Settings" className="text-xs text-muted-foreground px-2 py-1.5">
              <Command.Item
                className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-accent aria-selected:bg-accent"
                onSelect={() => {
                  onNavigateSettings();
                  setCommandPaletteOpen(false);
                }}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Command.Item>
              <Command.Item
                className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-accent aria-selected:bg-accent"
                onSelect={() => {
                  onToggleTheme();
                  setCommandPaletteOpen(false);
                }}
              >
                <Sun className="h-4 w-4 hidden dark:block" />
                <Moon className="h-4 w-4 dark:hidden" />
                Toggle Theme
              </Command.Item>
              <Command.Item
                className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-accent aria-selected:bg-accent"
                onSelect={() => {
                  onLogout();
                  setCommandPaletteOpen(false);
                }}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Command.Item>
            </Command.Group>
          </Command.List>

          <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">Esc</kbd> to close
            <span className="mx-2">|</span>
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">Enter</kbd> to select
          </div>
        </Command>
      </div>
    </div>
  );
}
