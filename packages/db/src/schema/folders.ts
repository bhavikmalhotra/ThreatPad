import { pgTable, uuid, varchar, integer, timestamp, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { workspaces } from './workspaces';
import { users } from './users';

export const folders = pgTable('folders', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id'),
  name: varchar('name', { length: 255 }).notNull(),
  position: integer('position').notNull().default(0),
  depth: integer('depth').notNull().default(0),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('idx_folders_workspace').on(table.workspaceId),
  index('idx_folders_parent').on(table.parentId),
  check('max_depth', sql`${table.depth} <= 5`),
]);
