import { pgTable, uuid, varchar, boolean, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  avatarColor: varchar('avatar_color', { length: 7 }).notNull().default('#6366f1'),
  oauthProvider: varchar('oauth_provider', { length: 50 }),
  oauthId: varchar('oauth_id', { length: 255 }),
  emailVerified: boolean('email_verified').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
}, (table) => [
  index('idx_users_email').on(table.email),
  uniqueIndex('idx_users_oauth').on(table.oauthProvider, table.oauthId),
]);
