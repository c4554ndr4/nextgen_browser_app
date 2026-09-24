import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, check } from 'drizzle-orm/sqlite-core';
export const quotas = sqliteTable('quotas', {
  key: text('key').primaryKey(),
  used: integer('used').notNull(),
  cap: integer('cap').notNull(),
  expires: integer('expires').notNull(),
}, (t) => [check('quota_cap', sql`${t.used} <= ${t.cap}`)]);
