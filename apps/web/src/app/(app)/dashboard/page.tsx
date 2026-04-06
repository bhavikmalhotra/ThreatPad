'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Clock, Pin, TrendingUp, Loader2, PenTool } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatRelativeDate } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import { api } from '@/lib/api-client';

interface NoteListItem {
  id: string;
  title: string;
  type?: 'text' | 'drawing';
  updatedAt: string;
  pinned: boolean;
  tags: { id: string; name: string; color: string }[];
}

export default function DashboardPage() {
  const router = useRouter();
  const { activeWorkspaceId } = useUIStore();
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeWorkspaceId) return;

    api.get<{ data: NoteListItem[] }>(
      `/api/workspaces/${activeWorkspaceId}/notes?limit=20`,
    )
      .then((res) => setNotes(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeWorkspaceId]);

  const pinnedNotes = notes.filter((n) => n.pinned);
  const totalNotes = notes.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back. Here&apos;s your recent activity.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Notes', value: String(totalNotes), icon: FileText },
          { label: 'Pinned', value: String(pinnedNotes.length), icon: Pin },
          { label: 'Recent', value: String(Math.min(totalNotes, 20)), icon: TrendingUp },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                <stat.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pinned */}
      {pinnedNotes.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Pin className="h-3.5 w-3.5" />
            Pinned
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pinnedNotes.map((note) => (
              <button
                key={note.id}
                onClick={() =>
                  router.push(`/workspace/${activeWorkspaceId}/note/${note.id}`)
                }
                className="flex flex-col rounded-lg border border-border bg-card p-4 hover:bg-accent transition-colors text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium truncate flex-1">{note.title}</div>
                  <Pin className="h-3.5 w-3.5 text-primary shrink-0" />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {note.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                    </span>
                  ))}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {formatRelativeDate(note.updatedAt)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5" />
          Recent Notes
        </h2>
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No notes yet. Create your first note to get started.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {notes.map((note) => (
              <button
                key={note.id}
                onClick={() =>
                  router.push(`/workspace/${activeWorkspaceId}/note/${note.id}`)
                }
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:bg-accent transition-colors text-left w-full"
              >
                {note.type === 'drawing' ? (
                  <PenTool className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{note.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    {note.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatRelativeDate(note.updatedAt)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Action */}
      <div className="mt-8 flex justify-center">
        <Button
          className="gap-2"
          onClick={() => {
            if (activeWorkspaceId) {
              api.post<{ data: { id: string } }>(
                `/api/workspaces/${activeWorkspaceId}/notes`,
                { title: 'Untitled' },
              ).then((res) => {
                router.push(`/workspace/${activeWorkspaceId}/note/${res.data.id}`);
              });
            }
          }}
        >
          <FileText className="h-4 w-4" />
          Create New Note
        </Button>
      </div>
    </div>
  );
}
