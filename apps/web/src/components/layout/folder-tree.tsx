'use client';

import { useState } from 'react';
import {
  ChevronRight,
  Folder,
  FolderOpen,
  FileText,
  MoreHorizontal,
  Plus,
  Trash2,
  Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import type { FolderTreeNode } from '@threatpad/shared';

interface FolderTreeProps {
  folders: FolderTreeNode[];
  activeFolderId?: string | null;
  activeNoteId?: string | null;
  onFolderSelect: (folderId: string) => void;
  onNoteSelect: (noteId: string) => void;
  onCreateFolder: (parentId?: string) => void;
  onCreateNote: (folderId?: string) => void;
  onRenameFolder: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
}

export function FolderTree({
  folders,
  activeFolderId,
  activeNoteId,
  onFolderSelect,
  onNoteSelect,
  onCreateFolder,
  onCreateNote,
  onRenameFolder,
  onDeleteFolder,
}: FolderTreeProps) {
  return (
    <div className="flex flex-col gap-0.5">
      {folders.map((folder) => (
        <FolderNode
          key={folder.id}
          folder={folder}
          activeFolderId={activeFolderId}
          activeNoteId={activeNoteId}
          onFolderSelect={onFolderSelect}
          onNoteSelect={onNoteSelect}
          onCreateFolder={onCreateFolder}
          onCreateNote={onCreateNote}
          onRenameFolder={onRenameFolder}
          onDeleteFolder={onDeleteFolder}
          depth={0}
        />
      ))}
    </div>
  );
}

interface FolderNodeProps {
  folder: FolderTreeNode;
  activeFolderId?: string | null;
  onFolderSelect: (folderId: string) => void;
  onCreateFolder: (parentId?: string) => void;
  onCreateNote: (folderId?: string) => void;
  onRenameFolder: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  depth: number;
}

function FolderNode({
  folder,
  activeFolderId,
  onFolderSelect,
  onNoteSelect,
  onCreateFolder,
  onCreateNote,
  onRenameFolder,
  onDeleteFolder,
  activeNoteId,
  depth,
}: FolderNodeProps & { onNoteSelect: (noteId: string) => void; activeNoteId?: string | null }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const isActive = activeFolderId === folder.id;
  const hasChildren = folder.children.length > 0 || (folder.notes && folder.notes.length > 0);

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1 rounded-md px-2 py-1 text-sm cursor-pointer hover:bg-sidebar-accent transition-colors',
          isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 p-0.5 rounded hover:bg-border/50"
        >
          <ChevronRight
            className={cn(
              'h-3.5 w-3.5 text-muted-foreground transition-transform',
              expanded && 'rotate-90',
              !hasChildren && 'invisible',
            )}
          />
        </button>

        <button
          onClick={() => onFolderSelect(folder.id)}
          className="flex items-center gap-2 min-w-0 flex-1"
        >
          {expanded ? (
            <FolderOpen className="h-4 w-4 text-primary shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className="truncate text-sidebar-foreground">{folder.name}</span>
          {folder.noteCount > 0 && (
            <span className="text-xs text-muted-foreground ml-auto shrink-0">
              {folder.noteCount}
            </span>
          )}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onCreateNote(folder.id)}>
              <FileText className="h-4 w-4 mr-2" />
              New Note
            </DropdownMenuItem>
            {folder.depth < 5 && (
              <DropdownMenuItem onClick={() => onCreateFolder(folder.id)}>
                <Plus className="h-4 w-4 mr-2" />
                New Subfolder
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onRenameFolder(folder.id)}>
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDeleteFolder(folder.id)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {expanded && hasChildren && (
        <div>
          {folder.children.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              activeFolderId={activeFolderId}
              activeNoteId={activeNoteId}
              onFolderSelect={onFolderSelect}
              onNoteSelect={onNoteSelect}
              onCreateFolder={onCreateFolder}
              onCreateNote={onCreateNote}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              depth={depth + 1}
            />
          ))}
          {folder.notes?.map((note) => (
            <button
              key={note.id}
              onClick={() => onNoteSelect(note.id)}
              className={cn(
                'flex items-center gap-2 w-full rounded-md px-2 py-1 text-sm hover:bg-sidebar-accent transition-colors',
                activeNoteId === note.id && 'bg-sidebar-accent text-sidebar-accent-foreground',
              )}
              style={{ paddingLeft: `${(depth + 1) * 12 + 8 + 20}px` }}
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate text-sidebar-foreground">{note.title || 'Untitled'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
