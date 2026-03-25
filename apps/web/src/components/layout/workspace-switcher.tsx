'use client';

import { ChevronDown, Plus, Shield } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import type { WorkspaceWithRole } from '@threatpad/shared';

interface WorkspaceSwitcherProps {
  workspaces: WorkspaceWithRole[];
  activeWorkspace: WorkspaceWithRole | null;
  onSelect: (workspace: WorkspaceWithRole) => void;
  onCreateNew: () => void;
}

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspace,
  onSelect,
  onCreateNew,
}: WorkspaceSwitcherProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between gap-2 px-3 py-2 h-auto"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/20 text-primary shrink-0">
              <Shield className="h-3.5 w-3.5" />
            </div>
            <span className="truncate text-sm font-medium">
              {activeWorkspace?.name || 'Select Workspace'}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        {workspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            onClick={() => onSelect(workspace)}
            className="gap-2"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/20 text-primary shrink-0">
              <Shield className="h-3.5 w-3.5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="truncate text-sm">{workspace.name}</span>
              <span className="text-xs text-muted-foreground">
                {workspace.isPersonal ? 'Personal' : `${workspace.memberCount} members`}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCreateNew} className="gap-2">
          <Plus className="h-4 w-4" />
          <span>Create Workspace</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
