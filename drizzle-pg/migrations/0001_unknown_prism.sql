CREATE TABLE "districts" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"color" text,
	"boundary_geojson" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "districts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "district_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "district_id" text;--> statement-breakpoint
CREATE INDEX "pg_districts_slug_idx" ON "districts" USING btree ("slug");--> statement-breakpoint
ALTER TABLE "schools" ADD CONSTRAINT "schools_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pg_schools_district_id_idx" ON "schools" USING btree ("district_id");--> statement-breakpoint
CREATE INDEX "pg_users_district_id_idx" ON "users" USING btree ("district_id");