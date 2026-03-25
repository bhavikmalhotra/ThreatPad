import type { WorkspaceRole } from '../types/workspace';

export const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  owner: 3,
  editor: 2,
  viewer: 1,
};

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
};

export function hasPermission(
  userRole: WorkspaceRole,
  requiredRole: WorkspaceRole,
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
