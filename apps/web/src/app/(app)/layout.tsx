'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { CommandPalette } from '@/components/layout/command-palette';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import type { WorkspaceWithRole, FolderTreeNode, Tag } from '@threatpad/shared';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { activeWorkspaceId, setActiveWorkspaceId } = useUIStore();
  const { isAuthenticated, accessToken, user } = useAuthStore();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [workspaces, setWorkspaces] = useState<WorkspaceWithRole[]>([]);
  const [folders, setFolders] = useState<FolderTreeNode[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  // Auth guard
  useEffect(() => {
    if (!accessToken) {
      router.replace('/login');
    }
  }, [accessToken, router]);

  // Fetch workspaces
  useEffect(() => {
    if (!accessToken) return;

    api.get<{ data: WorkspaceWithRole[] }>('/api/workspaces')
      .then((res) => {
        setWorkspaces(res.data);
        // Set active workspace to first non-personal or first available
        if (!activeWorkspaceId && res.data.length > 0) {
          const nonPersonal = res.data.find((w) => !w.isPersonal);
          setActiveWorkspaceId((nonPersonal || res.data[0])!.id);
        }
      })
      .catch(() => {
        // Token may be expired
      })
      .finally(() => setLoading(false));
  }, [accessToken, activeWorkspaceId, setActiveWorkspaceId]);

  // Fetch folders & tags when active workspace changes
  const refreshFolders = useCallback(() => {
    if (!accessToken || !activeWorkspaceId) return;
    api.get<{ data: FolderTreeNode[] }>(`/api/workspaces/${activeWorkspaceId}/folders`)
      .then((res) => setFolders(res.data))
      .catch(() => setFolders([]));
  }, [accessToken, activeWorkspaceId]);

  const refreshTags = useCallback(() => {
    if (!accessToken || !activeWorkspaceId) return;
    api.get<{ data: Tag[] }>(`/api/workspaces/${activeWorkspaceId}/tags`)
      .then((res) => setTags(res.data))
      .catch(() => setTags([]));
  }, [accessToken, activeWorkspaceId]);

  useEffect(() => {
    refreshFolders();
    refreshTags();
  }, [refreshFolders, refreshTags]);

  // Listen for refresh events from child pages
  useEffect(() => {
    const handleRefreshFolders = () => refreshFolders();
    const handleRefreshTags = () => refreshTags();
    window.addEventListener('threatpad:refresh-folders', handleRefreshFolders);
    window.addEventListener('threatpad:refresh-tags', handleRefreshTags);
    return () => {
      window.removeEventListener('threatpad:refresh-folders', handleRefreshFolders);
      window.removeEventListener('threatpad:refresh-tags', handleRefreshTags);
    };
  }, [refreshFolders, refreshTags]);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0] || null;

  const handleWorkspaceSelect = useCallback(
    (workspace: WorkspaceWithRole) => {
      setActiveWorkspaceId(workspace.id);
      router.push(`/workspace/${workspace.id}`);
    },
    [setActiveWorkspaceId, router],
  );

  const handleTagToggle = useCallback((tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((t) => t !== tagId)
        : [...prev, tagId],
    );
  }, []);

  const handleDeleteTag = useCallback(async (tagId: string) => {
    if (!activeWorkspaceId) return;
    if (!confirm('Delete this tag? It will be removed from all notes.')) return;
    try {
      await api.delete(`/api/workspaces/${activeWorkspaceId}/tags/${tagId}`);
      setTags((prev) => prev.filter((t) => t.id !== tagId));
      setSelectedTags((prev) => prev.filter((t) => t !== tagId));
    } catch {}
  }, [activeWorkspaceId]);

  const handleLogout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // Ignore — we're logging out anyway
    }
    useAuthStore.getState().logout();
    router.push('/login');
  }, [router]);

  const handleCreateWorkspace = useCallback(async () => {
    const name = prompt('Workspace name:');
    if (!name) return;

    try {
      const res = await api.post<{ data: WorkspaceWithRole }>('/api/workspaces', { name });
      const wsRes = await api.get<{ data: WorkspaceWithRole[] }>('/api/workspaces');
      setWorkspaces(wsRes.data);
      setActiveWorkspaceId(res.data.id);
      router.push(`/workspace/${res.data.id}`);
    } catch {}
  }, [setActiveWorkspaceId, router]);

  const handleCreateFolder = useCallback(async (parentId?: string) => {
    if (!activeWorkspaceId) return;
    const name = prompt('Folder name:');
    if (!name) return;

    try {
      await api.post(`/api/workspaces/${activeWorkspaceId}/folders`, { name, parentId: parentId || undefined });
      // Refresh folders
      const res = await api.get<{ data: FolderTreeNode[] }>(`/api/workspaces/${activeWorkspaceId}/folders`);
      setFolders(res.data);
    } catch {
      // Handle error
    }
  }, [activeWorkspaceId]);

  const handleCreateNote = useCallback(async (folderId?: string) => {
    if (!activeWorkspaceId) return;
    try {
      const res = await api.post<{ data: { id: string } }>(`/api/workspaces/${activeWorkspaceId}/notes`, {
        title: 'Untitled',
        visibility: 'workspace',
        folderId: folderId || undefined,
      });
      // Refresh folders to show the new note in the tree
      if (folderId) {
        api.get<{ data: FolderTreeNode[] }>(`/api/workspaces/${activeWorkspaceId}/folders`)
          .then((r) => setFolders(r.data))
          .catch(() => {});
      }
      router.push(`/workspace/${activeWorkspaceId}/note/${res.data.id}`);
    } catch {
      // Handle error
    }
  }, [activeWorkspaceId, router]);

  // Don't render if not authenticated
  if (!accessToken) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <Header
        onNavigateSettings={() => router.push('/settings/profile')}
        onLogout={handleLogout}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
          folders={folders}
          tags={tags}
          activeFolderId={null}
          activeNoteId={null}
          selectedTags={selectedTags}
          onWorkspaceSelect={handleWorkspaceSelect}
          onCreateWorkspace={handleCreateWorkspace}
          onFolderSelect={(folderId) =>
            router.push(`/workspace/${activeWorkspace?.id}?folder=${folderId}`)
          }
          onNoteSelect={(noteId) =>
            router.push(`/workspace/${activeWorkspace?.id}/note/${noteId}`)
          }
          onCreateFolder={handleCreateFolder}
          onCreateNote={handleCreateNote}
          onRenameFolder={() => {}}
          onDeleteFolder={() => {}}
          onTagToggle={handleTagToggle}
          onDeleteTag={handleDeleteTag}
          onSearch={() => {}}
          onOpenTemplates={() => {}}
          onOpenSettings={() => {
            if (activeWorkspace) router.push(`/workspace/${activeWorkspace.id}/settings`);
          }}
          onOpenTrash={() => {}}
        />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
      <CommandPalette
        onCreateNote={handleCreateNote}
        onCreateFolder={handleCreateFolder}
        onNavigateSettings={() => router.push('/settings/profile')}
        onToggleTheme={() => {}}
        onLogout={handleLogout}
        onSearch={() => {}}
      />
    </div>
  );
}
