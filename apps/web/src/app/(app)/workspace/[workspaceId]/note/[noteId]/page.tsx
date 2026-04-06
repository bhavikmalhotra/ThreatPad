'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  MoreHorizontal,
  Pin,
  Lock,
  Globe,
  Download,
  History,
  Scan,
  Tag,
  Trash2,
  Copy,
  Loader2,
  X,
  Share2,
  Plus,
  Users,
  LayoutTemplate,
} from 'lucide-react';
import { NoteEditor } from '@/components/editor/editor';
import { DrawingEditor } from '@/components/editor/drawing-editor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatRelativeDate } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';

interface NoteData {
  id: string;
  title: string;
  contentMd: string;
  type: 'text' | 'drawing';
  visibility: 'workspace' | 'private' | 'custom';
  pinned: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  wordCount: number;
}

interface IocData {
  id: string;
  type: string;
  value: string;
  defangedValue: string | null;
  confidence: number;
}

interface ExportFormatInfo {
  key: string;
  label: string;
  description?: string;
  fileExtension: string;
  contentType: string;
}

interface TagData {
  id: string;
  name: string;
  color: string;
}

interface PermissionData {
  id: string;
  role: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarColor: string;
  } | null;
}

const IOC_TYPE_COLORS: Record<string, string> = {
  ipv4: '#ef4444',
  ipv6: '#ef4444',
  domain: '#f97316',
  url: '#3b82f6',
  email: '#14b8a6',
  md5: '#a855f7',
  sha1: '#a855f7',
  sha256: '#a855f7',
  cve: '#ec4899',
  other: '#6b7280',
};

const TAG_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899',
];

export default function NoteEditorPage() {
  const params = useParams();
  const router = useRouter();
  const noteId = params.noteId as string;
  const workspaceId = params.workspaceId as string;
  const isNew = noteId === 'new';
  const { user } = useAuthStore();

  const [note, setNote] = useState<NoteData | null>(null);
  const [title, setTitle] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [visibility, setVisibility] = useState<'workspace' | 'private'>('workspace');
  const [showIocPanel, setShowIocPanel] = useState(false);
  const [iocs, setIocs] = useState<IocData[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [extracting, setExtracting] = useState(false);
  const [noteTags, setNoteTags] = useState<TagData[]>([]);
  const [workspaceTags, setWorkspaceTags] = useState<TagData[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);

  // Export formats (plugin-based)
  const [exportFormats, setExportFormats] = useState<ExportFormatInfo[]>([]);

  // Create tag state
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6366f1');

  // Version history state
  const [showVersionPanel, setShowVersionPanel] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Share state
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState('viewer');
  const [shareError, setShareError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [permissions, setPermissions] = useState<PermissionData[]>([]);

  // Load note data
  useEffect(() => {
    if (isNew) {
      api.post<{ data: { id: string } }>(
        `/api/workspaces/${workspaceId}/notes`,
        { title: 'Untitled' },
      ).then((res) => {
        router.replace(`/workspace/${workspaceId}/note/${res.data.id}`);
      });
      return;
    }

    api.get<{ data: NoteData }>(`/api/workspaces/${workspaceId}/notes/${noteId}`)
      .then((res) => {
        const n = res.data;
        setNote(n);
        setTitle(n.title);
        setIsPinned(n.pinned);
        setVisibility(n.visibility === 'private' ? 'private' : 'workspace');
      })
      .catch(() => {
        router.replace(`/workspace/${workspaceId}`);
      })
      .finally(() => setLoading(false));

    // Load workspace tags
    api.get<{ data: TagData[] }>(`/api/workspaces/${workspaceId}/tags`)
      .then((res) => setWorkspaceTags(res.data))
      .catch(() => {});

    // Load note's current tags
    api.get<{ data: { id: string; tags: TagData[] }[] }>(`/api/workspaces/${workspaceId}/notes?limit=50`)
      .then((res) => {
        const thisNote = res.data.find((n: any) => n.id === noteId);
        if (thisNote) setNoteTags(thisNote.tags || []);
      })
      .catch(() => {});

    // Load existing IOCs
    api.get<{ data: IocData[] }>(`/api/notes/${noteId}/iocs`)
      .then((res) => setIocs(res.data))
      .catch(() => {});

    // Load available export formats
    api.get<{ data: ExportFormatInfo[] }>('/api/export-formats')
      .then((res) => setExportFormats(res.data))
      .catch(() => {});
  }, [noteId, workspaceId, isNew, router]);

  // Debounced title save
  useEffect(() => {
    if (isNew || !note || title === note.title) return;
    const timeout = setTimeout(() => {
      api.patch(`/api/workspaces/${workspaceId}/notes/${noteId}`, { title }).then(() => {
        // Notify layout to refresh folder tree
        window.dispatchEvent(new CustomEvent('threatpad:refresh-folders'));
      });
    }, 1000);
    return () => clearTimeout(timeout);
  }, [title, note, noteId, workspaceId, isNew]);

  const handleTogglePin = useCallback(async () => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    await api.patch(`/api/workspaces/${workspaceId}/notes/${noteId}`, { pinned: newPinned });
  }, [isPinned, workspaceId, noteId]);

  const handleToggleVisibility = useCallback(async () => {
    const newVis = visibility === 'workspace' ? 'private' : 'workspace';
    setVisibility(newVis);
    await api.patch(`/api/workspaces/${workspaceId}/notes/${noteId}`, { visibility: newVis });
  }, [visibility, workspaceId, noteId]);

  const handleExtractIocs = useCallback(async () => {
    setExtracting(true);
    try {
      const res = await api.post<{ data: IocData[] }>(`/api/notes/${noteId}/extract-iocs`);
      setIocs(res.data);
      setShowIocPanel(true);
    } catch {}
    setExtracting(false);
  }, [noteId]);

  // Debounced auto-save for content
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleContentUpdate = useCallback(
    (html: string) => {
      if (isNew) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        api.put(`/api/workspaces/${workspaceId}/notes/${noteId}/content`, {
          contentMd: html,
        }).catch(() => {});
      }, 1000);
    },
    [workspaceId, noteId, isNew],
  );

  const handleDelete = useCallback(async () => {
    await api.delete(`/api/workspaces/${workspaceId}/notes/${noteId}`);
    router.replace(`/workspace/${workspaceId}`);
  }, [workspaceId, noteId, router]);

  const handleDuplicate = useCallback(async () => {
    const res = await api.post<{ data: { id: string } }>(
      `/api/workspaces/${workspaceId}/notes/${noteId}/duplicate`,
    );
    router.push(`/workspace/${workspaceId}/note/${res.data.id}`);
  }, [workspaceId, noteId, router]);

  const handleAddTag = useCallback(async (tag: TagData) => {
    try {
      await api.post(`/api/workspaces/${workspaceId}/notes/${noteId}/tags`, { tagIds: [tag.id] });
      setNoteTags((prev) => [...prev, tag]);
      window.dispatchEvent(new CustomEvent('threatpad:refresh-tags'));
    } catch {}
  }, [workspaceId, noteId]);

  const handleRemoveTag = useCallback(async (tagId: string) => {
    try {
      await api.delete(`/api/workspaces/${workspaceId}/notes/${noteId}/tags/${tagId}`);
      setNoteTags((prev) => prev.filter((t) => t.id !== tagId));
      window.dispatchEvent(new CustomEvent('threatpad:refresh-tags'));
    } catch {}
  }, [workspaceId, noteId]);

  const handleCreateTag = useCallback(async () => {
    if (!newTagName.trim()) return;
    try {
      const res = await api.post<{ data: TagData }>(`/api/workspaces/${workspaceId}/tags`, {
        name: newTagName.trim(),
        color: newTagColor,
      });
      setWorkspaceTags((prev) => [...prev, res.data]);
      // Also add it to the note
      await api.post(`/api/workspaces/${workspaceId}/notes/${noteId}/tags`, { tagIds: [res.data.id] });
      setNoteTags((prev) => [...prev, res.data]);
      setNewTagName('');
      setShowCreateTag(false);
      window.dispatchEvent(new CustomEvent('threatpad:refresh-tags'));
    } catch {}
  }, [workspaceId, noteId, newTagName, newTagColor]);

  // Share handlers
  const loadPermissions = useCallback(async () => {
    try {
      const res = await api.get<{ data: PermissionData[] }>(
        `/api/workspaces/${workspaceId}/notes/${noteId}/permissions`,
      );
      setPermissions(res.data);
    } catch {}
  }, [workspaceId, noteId]);

  const handleShare = useCallback(async () => {
    if (!shareEmail.trim()) return;
    setShareError('');
    setSharing(true);
    try {
      await api.post(`/api/workspaces/${workspaceId}/notes/${noteId}/permissions`, {
        email: shareEmail.trim(),
        role: shareRole,
      });
      setShareEmail('');
      loadPermissions();
    } catch (err) {
      setShareError(err instanceof Error ? err.message : 'Failed to share');
    }
    setSharing(false);
  }, [workspaceId, noteId, shareEmail, shareRole, loadPermissions]);

  const handleRemovePermission = useCallback(async (permId: string) => {
    try {
      await api.delete(`/api/workspaces/${workspaceId}/notes/${noteId}/permissions/${permId}`);
      setPermissions((prev) => prev.filter((p) => p.id !== permId));
    } catch {}
  }, [workspaceId, noteId]);

  const handleShowVersions = useCallback(async () => {
    setShowVersionPanel(true);
    setLoadingVersions(true);
    try {
      const res = await api.get<{ data: any[] }>(`/api/notes/${noteId}/versions`);
      setVersions(res.data);
    } catch {}
    setLoadingVersions(false);
  }, [noteId]);

  const handleRestoreVersion = useCallback(async (versionId: string) => {
    try {
      await api.post(`/api/notes/${noteId}/versions/${versionId}/restore`);
      // Reload the note
      const res = await api.get<{ data: NoteData }>(`/api/workspaces/${workspaceId}/notes/${noteId}`);
      const n = res.data;
      setNote(n);
      setTitle(n.title);
      setShowVersionPanel(false);
      // Force page reload to refresh editor content
      window.location.reload();
    } catch {}
  }, [noteId, workspaceId]);

  const handleExportNote = useCallback(() => {
    if (!note) return;
    const content = `# ${title}\n\n${note.contentMd}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'Untitled'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [note, title]);

  const handleSaveAsTemplate = useCallback(async () => {
    if (!note) return;
    const name = prompt('Template name:', title || 'Untitled Template');
    if (!name) return;
    try {
      await api.post(`/api/workspaces/${workspaceId}/templates`, {
        name,
        description: `Created from note: ${title}`,
        category: 'custom',
        contentMd: note.contentMd,
      });
      alert('Template saved!');
    } catch {}
  }, [note, title, workspaceId]);

  const handleExportIocs = useCallback(async (format: ExportFormatInfo) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/notes/${noteId}/iocs/export?format=${format.key}`,
        {
          headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken}` },
        },
      );
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `iocs-${noteId}${format.fileExtension}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  }, [noteId]);

  if (loading || isNew) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!note) return null;

  const noteTagIds = new Set(noteTags.map((t) => t.id));
  const availableTags = workspaceTags.filter((t) => !noteTagIds.has(t.id));

  return (
    <div className="flex h-full">
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Note Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-2 bg-card/50">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled"
              className="border-none bg-transparent text-lg font-bold h-auto py-0 px-0 focus-visible:ring-0 shadow-none"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Tags */}
            <div className="flex items-center gap-1 mr-2">
              {noteTags.map((tag) => (
                <Badge
                  key={tag.id}
                  className="text-[10px] text-white border-none cursor-pointer gap-1"
                  style={{ backgroundColor: tag.color }}
                  onClick={() => handleRemoveTag(tag.id)}
                  title={`Remove tag: ${tag.name}`}
                >
                  {tag.name}
                  <X className="h-2.5 w-2.5" />
                </Badge>
              ))}
              <DropdownMenu open={showTagPicker} onOpenChange={setShowTagPicker}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" title="Add tag">
                    <Tag className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {availableTags.map((tag) => (
                    <DropdownMenuItem
                      key={tag.id}
                      onClick={() => { handleAddTag(tag); setShowTagPicker(false); }}
                      className="gap-2"
                    >
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </DropdownMenuItem>
                  ))}
                  {availableTags.length > 0 && <DropdownMenuSeparator />}
                  {!showCreateTag ? (
                    <DropdownMenuItem
                      onClick={(e) => { e.preventDefault(); setShowCreateTag(true); }}
                      className="gap-2"
                    >
                      <Plus className="h-3 w-3" />
                      Create new tag
                    </DropdownMenuItem>
                  ) : (
                    <div className="p-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                      <Input
                        placeholder="Tag name"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        className="h-7 text-xs"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                      />
                      <div className="flex gap-1 flex-wrap">
                        {TAG_COLORS.map((c) => (
                          <button
                            key={c}
                            className={`h-5 w-5 rounded-full border-2 ${newTagColor === c ? 'border-white' : 'border-transparent'}`}
                            style={{ backgroundColor: c }}
                            onClick={() => setNewTagColor(c)}
                          />
                        ))}
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" className="h-6 text-xs flex-1" onClick={handleCreateTag}>
                          Create
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs"
                          onClick={() => { setShowCreateTag(false); setNewTagName(''); }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleTogglePin}
              title={isPinned ? 'Unpin note' : 'Pin note'}
            >
              <Pin
                className={`h-4 w-4 ${isPinned ? 'text-primary fill-primary' : ''}`}
              />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2"
              onClick={handleToggleVisibility}
              title={visibility === 'private' ? 'Click to make visible to workspace' : 'Click to make private'}
            >
              {visibility === 'private' ? (
                <>
                  <Lock className="h-4 w-4 text-yellow-500" />
                  <span className="text-xs text-yellow-500">Private</span>
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4" />
                  <span className="text-xs text-muted-foreground">Workspace</span>
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => { setShowShareDialog(true); loadPermissions(); }}
              title="Share note"
            >
              <Share2 className="h-4 w-4" />
            </Button>

            {note.type !== 'drawing' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleExtractIocs}
                disabled={extracting}
                title="Extract IOCs"
              >
                {extracting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Scan className="h-4 w-4" />
                )}
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="More actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleShowVersions}>
                  <History className="h-4 w-4 mr-2" />
                  Version History
                </DropdownMenuItem>
                {note.type !== 'drawing' && (
                  <>
                    <DropdownMenuItem onClick={handleExportNote}>
                      <Download className="h-4 w-4 mr-2" />
                      Export as Markdown
                    </DropdownMenuItem>
                    {exportFormats.map((fmt) => (
                      <DropdownMenuItem key={fmt.key} onClick={() => handleExportIocs(fmt)}>
                        <Download className="h-4 w-4 mr-2" />
                        Export IOCs as {fmt.label}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
                <DropdownMenuItem onClick={handleDuplicate}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSaveAsTemplate}>
                  <LayoutTemplate className="h-4 w-4 mr-2" />
                  Save as Template
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Metadata Bar */}
        <div className="flex items-center gap-4 px-4 py-1.5 border-b border-border text-xs text-muted-foreground bg-card/30">
          <span>Created by {user?.displayName || 'Unknown'}</span>
          <span>Modified {formatRelativeDate(note.updatedAt)}</span>
          <span>{note.type === 'drawing' ? 'Drawing' : `${note.wordCount} words`}</span>
        </div>

        {/* Editor */}
        <div className={`flex-1 ${note.type === 'drawing' ? 'overflow-visible relative' : 'overflow-hidden'}`}>
          {note.type === 'drawing' ? (
            <DrawingEditor
              initialContent={note.contentMd}
              onUpdate={handleContentUpdate}
              editable={true}
            />
          ) : (
            <NoteEditor
              initialContent={note.contentMd}
              workspaceId={workspaceId}
              presenceUsers={[]}
              editable={true}
              onUpdate={handleContentUpdate}
            />
          )}
        </div>
      </div>

      {/* IOC Side Panel */}
      {showIocPanel && (
        <div className="w-80 border-l border-border bg-card flex flex-col shrink-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Extracted IOCs</h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setShowIocPanel(false)}
            >
              Close
            </Button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {iocs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No IOCs found. Click the scan button to extract.
              </p>
            ) : (
              <div className="space-y-3">
                {iocs.map((ioc) => (
                  <div
                    key={ioc.id}
                    className="flex items-start gap-2 rounded-md border border-border p-2"
                  >
                    <Badge
                      className="text-[10px] text-white shrink-0 border-none"
                      style={{ backgroundColor: IOC_TYPE_COLORS[ioc.type] || '#6b7280' }}
                    >
                      {ioc.type.toUpperCase()}
                    </Badge>
                    <span className="text-xs font-mono break-all">
                      {ioc.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="border-t border-border p-3 space-y-2">
            <div className="flex gap-2">
              {exportFormats.map((fmt) => (
                <Button key={fmt.key} variant="outline" size="sm" className="flex-1 text-xs" onClick={() => handleExportIocs(fmt)}>
                  {fmt.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Version History Panel */}
      {showVersionPanel && (
        <div className="w-80 border-l border-border bg-card flex flex-col shrink-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Version History</h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setShowVersionPanel(false)}
            >
              Close
            </Button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {loadingVersions ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : versions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No versions found.
              </p>
            ) : (
              <div className="space-y-2">
                {versions.map((v) => (
                  <div
                    key={v.id}
                    className="rounded-md border border-border p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">v{v.versionNumber}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {v.snapshotReason}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {v.createdByUser?.displayName || 'Unknown'} &middot; {formatRelativeDate(v.createdAt)}
                    </p>
                    {(v.linesAdded > 0 || v.linesRemoved > 0) && (
                      <p className="text-[10px] text-muted-foreground">
                        <span className="text-green-500">+{v.linesAdded}</span>{' '}
                        <span className="text-red-500">-{v.linesRemoved}</span>
                      </p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs w-full mt-1"
                      onClick={() => handleRestoreVersion(v.id)}
                    >
                      Restore this version
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Share Note
            </DialogTitle>
            <DialogDescription>
              Share this note with other users by entering their email address.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Email address"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleShare()}
                className="flex-1"
              />
              <Select value={shareRole} onValueChange={setShareRole}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleShare} disabled={sharing}>
                {sharing ? 'Sharing...' : 'Share'}
              </Button>
            </div>

            {shareError && (
              <p className="text-xs text-destructive">{shareError}</p>
            )}

            {permissions.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">People with access</Label>
                {permissions.map((perm) => (
                  <div key={perm.id} className="flex items-center justify-between rounded-md border border-border p-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] text-white"
                        style={{ backgroundColor: perm.user?.avatarColor || '#6366f1' }}
                      >
                        {(perm.user?.displayName || '?')
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </div>
                      <div>
                        <div className="text-sm">{perm.user?.displayName || 'Unknown'}</div>
                        <div className="text-[10px] text-muted-foreground">{perm.user?.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {perm.role}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemovePermission(perm.id)}
                        title="Remove access"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
