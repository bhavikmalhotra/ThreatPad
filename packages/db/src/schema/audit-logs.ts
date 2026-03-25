import { pgTable, uuid, varchar, text, timestamp, index, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';
import { users } from './users';

export const auditActionEnum = pgEnum('audit_action', [
  'create', 'update', 'delete', 'restore',
  'share', 'unshare', 'login', 'logout',
  'role_change', 'export', 'view',
]);

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: auditActionEnum('action').notNull(),
  resourceType: varchar('resource_type', { length: 50 }).notNull(),
  resourceId: uuid('resource_id'),
  metadata: jsonb('metadata').default({}),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_audit_workspace').on(table.workspaceId, table.createdAt),
  index('idx_audit_user').on(table.userId, table.createdAt),
  index('idx_audit_resource').on(table.resourceType, table.resourceId),
]);
