import { pgTable, uuid, varchar, text, boolean, timestamp, index, pgEnum } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';
import { users } from './users';

export const templateCategoryEnum = pgEnum('template_category', [
  'ioc_dump', 'threat_actor', 'incident', 'campaign', 'blank', 'custom',
]);

export const noteTemplates = pgTable('note_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: templateCategoryEnum('category').notNull().default('custom'),
  contentMd: text('content_md').notNull(),
  isSystem: boolean('is_system').notNull().default(false),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_templates_workspace').on(table.workspaceId),
]);
