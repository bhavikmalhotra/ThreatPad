'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import {
  FileText,
  Plus,
  Search,
  LayoutGrid,
  List,
  SortAsc,
  Filter,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn, formatRelativeDate } from '@/lib/utils';
import { api } from '@/lib/api-client';

interface NoteListItem {
  id: string;
  title: string;
  snippet: string;
  tags: { id: string; name: string; color: string }[];
  updatedAt: string;
  createdByUser: { displayName: string } | null;
  pinned: boolean;
  wordCount: number;
}

export default function WorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const workspaceId = params.workspaceId as string;
  const tagFilter = searchParams.get('tags')?.split(',').filter(Boolean) || [];
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [workspaceName, setWorkspaceName] = useState('');

  useEffect(() => {
    api.get<{ data: { name: string } }>(`/api/workspaces/${workspaceId}`)
      .then((res) => setWorkspaceName(res.data.name))
      .catch(() => {});

    api.get<{ data: NoteListItem[] }>(`/api/workspaces/${workspaceId}/notes?limit=50`)
      .then((res) => setNotes(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.snippet || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTags =
      tagFilter.length === 0 ||
      tagFilter.some((tagId) => n.tags.some((t) => t.id === tagId));
    return matchesSearch && matchesTags;
  });

  const handleCreateNote = async () => {
    try {
      const res = await api.post<{ data: { id: string } }>(
        `/api/workspaces/${workspaceId}/notes`,
        { title: 'Untitled' },
      );
      router.push(`/workspace/${workspaceId}/note/${res.data.id}`);
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">{workspaceName || 'Workspace'}</h1>
          <p className="text-sm text-muted-foreground">
            {notes.length} notes
          </p>
        </div>
        <Button className="gap-2" onClick={handleCreateNote}>
          <Plus className="h-4 w-4" />
          New Note
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            className="pl-8 h-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              Filter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>All Notes</DropdownMenuItem>
            <DropdownMenuItem>Pinned</DropdownMenuItem>
            <DropdownMenuItem>Private</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <SortAsc className="h-3.5 w-3.5" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Last Modified</DropdownMenuItem>
            <DropdownMenuItem>Created Date</DropdownMenuItem>
            <DropdownMenuItem>Title A-Z</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex border border-border rounded-md">
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8 rounded-none rounded-l-md', viewMode === 'list' && 'bg-accent')}
            onClick={() => setViewMode('list')}
          >
            <List className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8 rounded-none rounded-r-md', viewMode === 'grid' && 'bg-accent')}
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Notes */}
      {filteredNotes.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {notes.length === 0
            ? 'No notes yet. Create your first note to get started.'
            : 'No notes match your search.'}
        </p>
      ) : viewMode === 'list' ? (
        <div className="flex flex-col gap-1">
          {filteredNotes.map((note) => (
            <button
              key={note.id}
              onClick={() =>
                router.push(`/workspace/${workspaceId}/note/${note.id}`)
              }
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:bg-accent transition-colors text-left w-full"
            >
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{note.title}</div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">
                  {note.snippet}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  {note.tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      className="text-[10px] text-white border-none h-4"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs text-muted-foreground">
                  {formatRelativeDate(note.updatedAt)}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {note.createdByUser?.displayName || ''}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredNotes.map((note) => (
            <button
              key={note.id}
              onClick={() =>
                router.push(`/workspace/${workspaceId}/note/${note.id}`)
              }
              className="flex flex-col rounded-lg border border-border bg-card p-4 hover:bg-accent transition-colors text-left"
            >
              <div className="text-sm font-medium truncate">{note.title}</div>
              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {note.snippet}
              </div>
              <div className="flex items-center gap-1.5 mt-3">
                {note.tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    className="text-[10px] text-white border-none h-4"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                <span className="text-[10px] text-muted-foreground">
                  {note.createdByUser?.displayName || ''}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatRelativeDate(note.updatedAt)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
