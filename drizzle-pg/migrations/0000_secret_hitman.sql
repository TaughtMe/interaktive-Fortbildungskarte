CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"details" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"ort" text NOT NULL,
	"typ" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"adresse" text NOT NULL,
	"tel" text NOT NULL,
	"fax" text,
	"mail" text NOT NULL,
	"web" text,
	"leitung" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_needs" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"created_by" text,
	"topic" text NOT NULL,
	"description" text NOT NULL,
	"priority" text NOT NULL,
	"target_group" text NOT NULL,
	"preferred_format" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_offers" (
	"id" text PRIMARY KEY NOT NULL,
	"training_need_id" text,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"date" timestamp with time zone,
	"location" text,
	"max_participants" integer,
	"format" text NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"role" text NOT NULL,
	"school_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_needs" ADD CONSTRAINT "training_needs_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_needs" ADD CONSTRAINT "training_needs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_offers" ADD CONSTRAINT "training_offers_training_need_id_training_needs_id_fk" FOREIGN KEY ("training_need_id") REFERENCES "public"."training_needs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pg_audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pg_audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "pg_audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "pg_schools_typ_idx" ON "schools" USING btree ("typ");--> statement-breakpoint
CREATE INDEX "pg_schools_ort_idx" ON "schools" USING btree ("ort");--> statement-breakpoint
CREATE INDEX "pg_sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pg_sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "pg_training_needs_school_id_idx" ON "training_needs" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "pg_training_needs_status_idx" ON "training_needs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pg_training_needs_priority_idx" ON "training_needs" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "pg_training_offers_training_need_id_idx" ON "training_offers" USING btree ("training_need_id");--> statement-breakpoint
CREATE INDEX "pg_training_offers_status_idx" ON "training_offers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pg_training_offers_date_idx" ON "training_offers" USING btree ("date");--> statement-breakpoint
CREATE INDEX "pg_users_school_id_idx" ON "users" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "pg_users_role_idx" ON "users" USING btree ("role");