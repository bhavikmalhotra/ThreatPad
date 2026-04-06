export interface Folder {
  id: string;
  workspaceId: string;
  parentId?: string | null;
  name: string;
  position: number;
  depth: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface FolderNoteItem {
  id: string;
  title: string;
  type: 'text' | 'drawing';
  folderId: string | null;
  updatedAt: string;
}

export interface FolderTreeNode extends Folder {
  children: FolderTreeNode[];
  noteCount: number;
  notes: FolderNoteItem[];
}
