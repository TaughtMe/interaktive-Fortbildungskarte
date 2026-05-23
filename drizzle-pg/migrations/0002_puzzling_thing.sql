CREATE TABLE "school_access_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"code_hash" text NOT NULL,
	"label" text,
	"active" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "school_access_codes" ADD CONSTRAINT "school_access_codes_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pg_school_access_codes_school_id_idx" ON "school_access_codes" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "pg_school_access_codes_active_idx" ON "school_access_codes" USING btree ("active");