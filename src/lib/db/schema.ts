import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { Role } from '@/types/auth';
import type { SchoolTypKey, TrainingNeedFormat, TrainingNeedPriority, TrainingNeedStatus } from '@/types';
import type { AuditAction, TrainingOfferStatus } from './schema.types';

// D1/SQLite schema for the prepared alternative path. PostgreSQL/Supabase is
// represented separately in schema.pg.ts and remains the preferred target.

export const schools = sqliteTable('schools', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ort: text('ort').notNull(),
  typ: text('typ').$type<SchoolTypKey>().notNull(),
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  adresse: text('adresse').notNull(),
  tel: text('tel').notNull(),
  fax: text('fax'),
  mail: text('mail').notNull(),
  web: text('web'),
  leitung: text('leitung'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
}, (table) => [
  index('schools_typ_idx').on(table.typ),
  index('schools_ort_idx').on(table.ort),
]);

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  display_name: text('display_name').notNull(),
  role: text('role').$type<Exclude<Role, 'public'>>().notNull(),
  school_id: text('school_id').references(() => schools.id),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
}, (table) => [
  index('users_school_id_idx').on(table.school_id),
  index('users_role_idx').on(table.role),
]);

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id),
  expires_at: text('expires_at').notNull(),
  created_at: text('created_at').notNull(),
}, (table) => [
  index('sessions_user_id_idx').on(table.user_id),
  index('sessions_expires_at_idx').on(table.expires_at),
]);

export const trainingNeeds = sqliteTable('training_needs', {
  id: text('id').primaryKey(),
  school_id: text('school_id').notNull().references(() => schools.id),
  created_by: text('created_by').references(() => users.id),
  topic: text('topic').notNull(),
  description: text('description').notNull(),
  priority: text('priority').$type<TrainingNeedPriority>().notNull(),
  target_group: text('target_group').notNull(),
  preferred_format: text('preferred_format').$type<TrainingNeedFormat>().notNull(),
  status: text('status').$type<TrainingNeedStatus>().notNull().default('open'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
}, (table) => [
  index('training_needs_school_id_idx').on(table.school_id),
  index('training_needs_status_idx').on(table.status),
  index('training_needs_priority_idx').on(table.priority),
]);

export const trainingOffers = sqliteTable('training_offers', {
  id: text('id').primaryKey(),
  training_need_id: text('training_need_id').references(() => trainingNeeds.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  date: text('date'),
  location: text('location'),
  max_participants: integer('max_participants'),
  format: text('format').$type<TrainingNeedFormat>().notNull(),
  status: text('status').$type<TrainingOfferStatus>().notNull().default('planned'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
}, (table) => [
  index('training_offers_training_need_id_idx').on(table.training_need_id),
  index('training_offers_status_idx').on(table.status),
  index('training_offers_date_idx').on(table.date),
]);

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  user_id: text('user_id').references(() => users.id),
  action: text('action').$type<AuditAction>().notNull(),
  entity_type: text('entity_type').notNull(),
  entity_id: text('entity_id').notNull(),
  details: text('details'),
  created_at: text('created_at').notNull(),
}, (table) => [
  index('audit_logs_user_id_idx').on(table.user_id),
  index('audit_logs_entity_idx').on(table.entity_type, table.entity_id),
  index('audit_logs_created_at_idx').on(table.created_at),
]);

export type SchoolSelect = typeof schools.$inferSelect;
export type SchoolInsert = typeof schools.$inferInsert;
export type UserSelect = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;
export type SessionSelect = typeof sessions.$inferSelect;
export type SessionInsert = typeof sessions.$inferInsert;
export type TrainingNeedSelect = typeof trainingNeeds.$inferSelect;
export type TrainingNeedInsert = typeof trainingNeeds.$inferInsert;
export type TrainingOfferSelect = typeof trainingOffers.$inferSelect;
export type TrainingOfferInsert = typeof trainingOffers.$inferInsert;
export type AuditLogSelect = typeof auditLogs.$inferSelect;
export type AuditLogInsert = typeof auditLogs.$inferInsert;
