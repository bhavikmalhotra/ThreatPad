import { pgTable, uuid, text, smallint, timestamp, index, pgEnum } from 'drizzle-orm/pg-core';
import { notes } from './notes';

export const iocTypeEnum = pgEnum('ioc_type', [
  'ipv4', 'ipv6', 'domain', 'url', 'email',
  'md5', 'sha1', 'sha256', 'cve', 'other',
]);

export const noteIocs = pgTable('note_iocs', {
  id: uuid('id').primaryKey().defaultRandom(),
  noteId: uuid('note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
  type: iocTypeEnum('type').notNull(),
  value: text('value').notNull(),
  defangedValue: text('defanged_value'),
  confidence: smallint('confidence').default(100),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
  context: text('context'),
}, (table) => [
  index('idx_iocs_note').on(table.noteId),
  index('idx_iocs_type').on(table.type),
  index('idx_iocs_value').on(table.value),
]);
