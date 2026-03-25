import { pgTable, uuid, varchar, text, boolean, timestamp, index, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';

export const workspaceRoleEnum = pgEnum('workspace_role', ['owner', 'editor', 'viewer']);

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  isPersonal: boolean('is_personal').notNull().default(false),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_workspaces_owner').on(table.ownerId),
]);

export const workspaceMembers = pgTable('workspace_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: workspaceRoleEnum('role').notNull().default('viewer'),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_wm_workspace').on(table.workspaceId),
  index('idx_wm_user').on(table.userId),
]);
