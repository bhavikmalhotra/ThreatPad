'use client';

import Link from 'next/link';
import {
  PanelLeftClose,
  PanelLeft,
  Settings,
  LogOut,
  User,
  Command,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';

interface HeaderProps {
  onNavigateSettings: () => void;
  onLogout: () => void;
}

export function Header({ onNavigateSettings, onLogout }: HeaderProps) {
  const { sidebarOpen, toggleSidebar, setCommandPaletteOpen } = useUIStore();
  const { user } = useAuthStore();

  const initials = user?.displayName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '??';

  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-background px-3">
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={toggleSidebar}
              >
                {sidebarOpen ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeft className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Link href="/dashboard" className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
          ThreatPad
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground"
                onClick={() => setCommandPaletteOpen(true)}
              >
                <Command className="h-3.5 w-3.5" />
                <span className="text-xs">Search</span>
                <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] font-mono text-muted-foreground">
                  <span className="text-xs">&#8984;</span>K
                </kbd>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Command palette</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
              <Avatar className="h-7 w-7">
                <AvatarFallback
                  style={{ backgroundColor: user?.avatarColor || '#6366f1' }}
                  className="text-[10px]"
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm">{user?.displayName}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {user?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onNavigateSettings}>
              <User className="h-4 w-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onNavigateSettings}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
