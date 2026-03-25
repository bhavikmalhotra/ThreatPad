import { pgTable, uuid, varchar, boolean, timestamp, index, primaryKey } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';
import { users } from './users';
import { notes } from './notes';

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  color: varchar('color', { length: 7 }).notNull().default('#6366f1'),
  isSystem: boolean('is_system').notNull().default(false),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_tags_workspace').on(table.workspaceId),
]);

export const noteTags = pgTable('note_tags', {
  noteId: uuid('note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.noteId, table.tagId] }),
  index('idx_nt_tag').on(table.tagId),
]);
