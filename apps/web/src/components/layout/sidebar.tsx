'use client';

import { useState } from 'react';
import {
  Search,
  Plus,
  FileText,
  FolderPlus,
  Tag,
  LayoutTemplate,
  Trash2,
  ChevronDown,
  Settings,
  X,
  PenTool,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { WorkspaceSwitcher } from './workspace-switcher';
import { FolderTree } from './folder-tree';
import { useUIStore } from '@/stores/ui-store';
import type { WorkspaceWithRole, FolderTreeNode, Tag as TagType } from '@threatpad/shared';

interface SidebarProps {
  workspaces: WorkspaceWithRole[];
  activeWorkspace: WorkspaceWithRole | null;
  folders: FolderTreeNode[];
  tags: TagType[];
  activeFolderId?: string | null;
  activeNoteId?: string | null;
  selectedTags: string[];
  onWorkspaceSelect: (workspace: WorkspaceWithRole) => void;
  onCreateWorkspace: () => void;
  onFolderSelect: (folderId: string) => void;
  onNoteSelect: (noteId: string) => void;
  onCreateFolder: (parentId?: string) => void;
  onCreateNote: (folderId?: string) => void;
  onCreateDrawing: (folderId?: string) => void;
  onRenameFolder: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onTagToggle: (tagId: string) => void;
  onDeleteTag?: (tagId: string) => void;
  onSearch: (query: string) => void;
  onOpenTemplates: () => void;
  onOpenTrash: () => void;
  onOpenSettings?: () => void;
}

export function Sidebar({
  workspaces,
  activeWorkspace,
  folders,
  tags,
  activeFolderId,
  activeNoteId,
  selectedTags,
  onWorkspaceSelect,
  onCreateWorkspace,
  onFolderSelect,
  onNoteSelect,
  onCreateFolder,
  onCreateNote,
  onCreateDrawing,
  onRenameFolder,
  onDeleteFolder,
  onTagToggle,
  onSearch,
  onDeleteTag,
  onOpenTemplates,
  onOpenTrash,
  onOpenSettings,
}: SidebarProps) {
  const { sidebarOpen } = useUIStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [tagsExpanded, setTagsExpanded] = useState(true);

  if (!sidebarOpen) return null;

  return (
    <aside className="flex h-full w-[280px] flex-col border-r border-sidebar-border bg-sidebar shrink-0">
      {/* Workspace Switcher */}
      <div className="px-2 pt-3 pb-2">
        <WorkspaceSwitcher
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
          onSelect={onWorkspaceSelect}
          onCreateNew={onCreateWorkspace}
        />
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            className="h-8 pl-8 bg-sidebar-accent border-sidebar-border text-sm"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.length > 2) onSearch(e.target.value);
            }}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-3 pb-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 border-sidebar-border bg-sidebar-accent hover:bg-sidebar-accent/80"
            >
              <Plus className="h-4 w-4" />
              New
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => onCreateNote()}>
              <FileText className="h-4 w-4 mr-2" />
              New Note
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreateDrawing()}>
              <PenTool className="h-4 w-4 mr-2" />
              New Drawing
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreateFolder()}>
              <FolderPlus className="h-4 w-4 mr-2" />
              New Folder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenTemplates}>
              <LayoutTemplate className="h-4 w-4 mr-2" />
              From Template
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Folder Tree */}
      <ScrollArea className="flex-1">
        <div className="px-2 py-2">
          <div className="mb-1 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Folders
          </div>
          <FolderTree
            folders={folders}
            activeFolderId={activeFolderId}
            activeNoteId={activeNoteId}
            onFolderSelect={onFolderSelect}
            onNoteSelect={onNoteSelect}
            onCreateFolder={onCreateFolder}
            onCreateNote={onCreateNote}
            onCreateDrawing={onCreateDrawing}
            onRenameFolder={onRenameFolder}
            onDeleteFolder={onDeleteFolder}
          />
        </div>

        <Separator className="bg-sidebar-border my-2" />

        {/* Tags */}
        <div className="px-2 py-2">
          <button
            onClick={() => setTagsExpanded(!tagsExpanded)}
            className="flex items-center gap-1 w-full px-2 mb-1"
          >
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 text-muted-foreground transition-transform',
                !tagsExpanded && '-rotate-90',
              )}
            />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tags
            </span>
          </button>
          {tagsExpanded && (
            <div className="flex flex-wrap gap-1.5 px-2 pt-1">
              {tags.map((tag) => (
                <div key={tag.id} className="group/tag inline-flex items-center gap-0.5">
                  <button
                    onClick={() => onTagToggle(tag.id)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition-colors border',
                      selectedTags.includes(tag.id)
                        ? 'border-transparent text-white'
                        : 'border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent',
                      onDeleteTag && 'rounded-r-none',
                    )}
                    style={
                      selectedTags.includes(tag.id)
                        ? { backgroundColor: tag.color }
                        : undefined
                    }
                  >
                    <Tag className="h-2.5 w-2.5" />
                    {tag.name}
                  </button>
                  {onDeleteTag && (
                    <button
                      onClick={() => onDeleteTag(tag.id)}
                      className={cn(
                        'inline-flex items-center rounded-r-md px-0.5 py-0.5 text-xs border border-l-0 opacity-0 group-hover/tag:opacity-100 transition-opacity',
                        selectedTags.includes(tag.id)
                          ? 'border-transparent text-white/80 hover:text-white'
                          : 'border-sidebar-border text-muted-foreground hover:text-foreground hover:bg-sidebar-accent',
                      )}
                      style={
                        selectedTags.includes(tag.id)
                          ? { backgroundColor: tag.color }
                          : undefined
                      }
                      title={`Delete tag: ${tag.name}`}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <Separator className="bg-sidebar-border" />

      {/* Bottom */}
      <div className="px-3 py-2 space-y-0.5">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={onOpenSettings}
        >
          <Settings className="h-4 w-4" />
          Workspace Settings
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={onOpenTrash}
        >
          <Trash2 className="h-4 w-4" />
          Trash
        </Button>
      </div>
    </aside>
  );
}
