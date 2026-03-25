import { pgTable, uuid, varchar, text, boolean, integer, timestamp, index, pgEnum, customType } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';
import { folders } from './folders';
import { noteTemplates } from './templates';
import { users } from './users';
import { workspaceRoleEnum } from './workspaces';

export const noteVisibilityEnum = pgEnum('note_visibility', ['private', 'workspace', 'custom']);

// Custom type for bytea
const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

export const notes = pgTable('notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  folderId: uuid('folder_id').references(() => folders.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 500 }).notNull().default('Untitled'),
  contentMd: text('content_md').notNull().default(''),
  yjsState: bytea('yjs_state'),
  visibility: noteVisibilityEnum('visibility').notNull().default('workspace'),
  templateId: uuid('template_id').references(() => noteTemplates.id),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  pinned: boolean('pinned').notNull().default(false),
  wordCount: integer('word_count').notNull().default(0),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('idx_notes_workspace').on(table.workspaceId),
  index('idx_notes_folder').on(table.folderId),
  index('idx_notes_created_by').on(table.createdBy),
  index('idx_notes_updated').on(table.workspaceId, table.updatedAt),
]);

export const notePermissions = pgTable('note_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  noteId: uuid('note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: workspaceRoleEnum('role').notNull().default('viewer'),
  grantedBy: uuid('granted_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_np_note').on(table.noteId),
  index('idx_np_user').on(table.userId),
]);

export const noteVersions = pgTable('note_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  noteId: uuid('note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
  contentMd: text('content_md').notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  versionNumber: integer('version_number').notNull(),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  linesAdded: integer('lines_added').notNull().default(0),
  linesRemoved: integer('lines_removed').notNull().default(0),
  snapshotReason: varchar('snapshot_reason', { length: 50 }).notNull().default('auto'),
}, (table) => [
  index('idx_nv_note').on(table.noteId, table.versionNumber),
]);
