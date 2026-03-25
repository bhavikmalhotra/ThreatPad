import type { UserProfile } from './user';

export type WorkspaceRole = 'owner' | 'editor' | 'viewer';

export interface Workspace {
  id: string;
  name: string;
  description?: string | null;
  isPersonal: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
  user: UserProfile;
}

export interface WorkspaceWithRole extends Workspace {
  role: WorkspaceRole;
  memberCount: number;
}
