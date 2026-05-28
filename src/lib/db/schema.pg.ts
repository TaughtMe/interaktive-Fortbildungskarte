import { boolean, doublePrecision, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { DatabaseRole } from '@/types/auth';
import type { ProductionRole } from './schema.types';
import type { GeoJsonObject } from 'geojson';
import type { SchoolTypKey, TrainingNeedFormat, TrainingNeedPriority, TrainingNeedStatus } from '@/types';
import type { AuditAction, TrainingOfferStatus } from './schema.types';

// Preferred future database target for Supabase/PostgreSQL. This schema is
// prepared only; the app still runs on mock/static data by default.
// PostgreSQL preparation only. IDs intentionally stay text-based for now:
// existing school IDs are stable semantic slugs, and this avoids a migration-only
// UUID rewrite before a real Supabase/PostgreSQL connection exists.

export const districts = pgTable('districts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  color: text('color'),
  boundary_geojson: jsonb('boundary_geojson').$type<GeoJsonObject>(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (table) => [
  index('pg_districts_slug_idx').on(table.slug),
]);

export const schools = pgTable('schools', {
  id: text('id').primaryKey(),
  district_id: text('district_id').references(() => districts.id),
  name: text('name').notNull(),
  ort: text('ort').notNull(),
  typ: text('typ').$type<SchoolTypKey>().notNull(),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  adresse: text('adresse').notNull(),
  tel: text('tel').notNull(),
  fax: text('fax'),
  mail: text('mail').notNull(),
  web: text('web'),
  leitung: text('leitung'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (table) => [
  index('pg_schools_district_id_idx').on(table.district_id),
  index('pg_schools_typ_idx').on(table.typ),
  index('pg_schools_ort_idx').on(table.ort),
]);

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  display_name: text('display_name').notNull(),
  role: text('role').$type<DatabaseRole>().notNull(),
  district_id: text('district_id').references(() => districts.id),
  school_id: text('school_id').references(() => schools.id),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (table) => [
  index('pg_users_district_id_idx').on(table.district_id),
  index('pg_users_school_id_idx').on(table.school_id),
  index('pg_users_role_idx').on(table.role),
]);

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
}, (table) => [
  index('pg_sessions_user_id_idx').on(table.user_id),
  index('pg_sessions_expires_at_idx').on(table.expires_at),
]);

export const schoolAccessCodes = pgTable('school_access_codes', {
  id: text('id').primaryKey(),
  school_id: text('school_id').notNull().references(() => schools.id),
  code_hash: text('code_hash').notNull(),
  label: text('label'),
  active: integer('active').notNull().default(1),
  expires_at: timestamp('expires_at', { withTimezone: true }),
  last_used_at: timestamp('last_used_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (table) => [
  index('pg_school_access_codes_school_id_idx').on(table.school_id),
  index('pg_school_access_codes_active_idx').on(table.active),
]);

export const trainingNeeds = pgTable('training_needs', {
  id: text('id').primaryKey(),
  school_id: text('school_id').notNull().references(() => schools.id),
  created_by: text('created_by').references(() => users.id),
  topic: text('topic').notNull(),
  description: text('description').notNull(),
  priority: text('priority').$type<TrainingNeedPriority>().notNull(),
  target_group: text('target_group').notNull(),
  preferred_format: text('preferred_format').$type<TrainingNeedFormat>().notNull(),
  status: text('status').$type<TrainingNeedStatus>().notNull().default('open'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (table) => [
  index('pg_training_needs_school_id_idx').on(table.school_id),
  index('pg_training_needs_status_idx').on(table.status),
  index('pg_training_needs_priority_idx').on(table.priority),
]);

export const trainingOffers = pgTable('training_offers', {
  id: text('id').primaryKey(),
  training_need_id: text('training_need_id').references(() => trainingNeeds.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  date: timestamp('date', { withTimezone: true }),
  location: text('location'),
  max_participants: integer('max_participants'),
  format: text('format').$type<TrainingNeedFormat>().notNull(),
  status: text('status').$type<TrainingOfferStatus>().notNull().default('planned'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (table) => [
  index('pg_training_offers_training_need_id_idx').on(table.training_need_id),
  index('pg_training_offers_status_idx').on(table.status),
  index('pg_training_offers_date_idx').on(table.date),
]);

// ── profiles ──────────────────────────────────────────────────────────────────
// Verknüpft Supabase Auth Users (auth.users) mit App-Rollen und Zuordnungen.
//
// WICHTIG: profiles.id → auth.users(id) ON DELETE CASCADE wird NICHT über
// references() abgebildet, weil auth.users im Supabase-internen auth-Schema
// liegt und nicht von Drizzle verwaltet werden darf.
// Der FK ist ausschließlich in der SQL-Migration (manuell) gesetzt.
//
// CHECK-Constraints (Produktivrollen, district/school-Pflicht) ebenfalls
// nur in der SQL-Migration — Drizzle unterstützt keine custom CHECK-Constraints
// über die pgTable-API auf diese Weise.
export const profiles = pgTable('profiles', {
  id:           uuid('id').primaryKey(),
  email:        text('email').notNull(),
  role:         text('role').$type<ProductionRole>().notNull(),
  district_id:  text('district_id').references(() => districts.id),
  school_id:    text('school_id').references(() => schools.id),
  display_name: text('display_name'),
  active:       boolean('active').notNull().default(true),
  created_at:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('pg_profiles_role_idx').on(table.role),
  index('pg_profiles_district_id_idx').on(table.district_id),
  index('pg_profiles_school_id_idx').on(table.school_id),
  index('pg_profiles_active_idx').on(table.active),
]);

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  user_id: text('user_id').references(() => users.id),
  action: text('action').$type<AuditAction>().notNull(),
  entity_type: text('entity_type').notNull(),
  entity_id: text('entity_id').notNull(),
  details: text('details'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
}, (table) => [
  index('pg_audit_logs_user_id_idx').on(table.user_id),
  index('pg_audit_logs_entity_idx').on(table.entity_type, table.entity_id),
  index('pg_audit_logs_created_at_idx').on(table.created_at),
]);

export type PgSchoolSelect = typeof schools.$inferSelect;
export type PgSchoolInsert = typeof schools.$inferInsert;
export type PgDistrictSelect = typeof districts.$inferSelect;
export type PgDistrictInsert = typeof districts.$inferInsert;
export type PgUserSelect = typeof users.$inferSelect;
export type PgUserInsert = typeof users.$inferInsert;
export type PgSessionSelect = typeof sessions.$inferSelect;
export type PgSessionInsert = typeof sessions.$inferInsert;
export type PgSchoolAccessCodeSelect = typeof schoolAccessCodes.$inferSelect;
export type PgSchoolAccessCodeInsert = typeof schoolAccessCodes.$inferInsert;
export type PgTrainingNeedSelect = typeof trainingNeeds.$inferSelect;
export type PgTrainingNeedInsert = typeof trainingNeeds.$inferInsert;
export type PgTrainingOfferSelect = typeof trainingOffers.$inferSelect;
export type PgTrainingOfferInsert = typeof trainingOffers.$inferInsert;
export type PgAuditLogSelect = typeof auditLogs.$inferSelect;
export type PgAuditLogInsert = typeof auditLogs.$inferInsert;
