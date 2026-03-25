import type { Tag } from './tag';
import type { UserProfile } from './user';

export type NoteVisibility = 'private' | 'workspace' | 'custom';

export interface Note {
  id: string;
  workspaceId: string;
  folderId?: string | null;
  title: string;
  contentMd: string;
  visibility: NoteVisibility;
  templateId?: string | null;
  createdBy: string;
  pinned: boolean;
  wordCount: number;
  position: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface NoteListItem {
  id: string;
  title: string;
  visibility: NoteVisibility;
  pinned: boolean;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
  createdByUser: UserProfile;
  tags: Tag[];
  snippet?: string;
}

export interface NoteVersion {
  id: string;
  noteId: string;
  contentMd: string;
  title: string;
  versionNumber: number;
  createdBy: string;
  createdByUser: UserProfile;
  createdAt: string;
  linesAdded: number;
  linesRemoved: number;
  snapshotReason: 'auto' | 'manual' | 'close';
}

export interface NotePermission {
  id: string;
  noteId: string;
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  grantedBy: string;
  createdAt: string;
  user: UserProfile;
}
