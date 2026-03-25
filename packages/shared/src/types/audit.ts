export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'restore'
  | 'share'
  | 'unshare'
  | 'login'
  | 'logout'
  | 'role_change'
  | 'export'
  | 'view';

export interface AuditLog {
  id: string;
  workspaceId?: string | null;
  userId?: string | null;
  action: AuditAction;
  resourceType: string;
  resourceId?: string | null;
  metadata: Record<string, unknown>;
  ipAddress?: string | null;
  createdAt: string;
  userName?: string;
}
