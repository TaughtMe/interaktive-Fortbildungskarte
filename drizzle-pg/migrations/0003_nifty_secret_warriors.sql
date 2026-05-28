CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"district_id" text,
	"school_id" text,
	"display_name" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pg_profiles_role_idx" ON "profiles" USING btree ("role");--> statement-breakpoint
CREATE INDEX "pg_profiles_district_id_idx" ON "profiles" USING btree ("district_id");--> statement-breakpoint
CREATE INDEX "pg_profiles_school_id_idx" ON "profiles" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "pg_profiles_active_idx" ON "profiles" USING btree ("active");

-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │  MANUELL ERGÄNZT — nicht drizzle-kit-verwaltet                           │
-- │  Grund: auth.users liegt im Supabase-internen auth-Schema.               │
-- │  Drizzle darf dieses Schema nicht verwalten.                             │
-- └──────────────────────────────────────────────────────────────────────────┘

-- 1. FK auf Supabase auth.users
--    profiles.id muss auf einen existierenden auth.users-Eintrag zeigen.
--    ON DELETE CASCADE: User-Löschung entfernt automatisch das Profil.
ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_id_auth_users_fk"
  FOREIGN KEY ("id")
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- 2. Nur Produktivrollen erlaubt
--    public, admin, leadership, school sind reine Demo-/Legacy-Rollen.
ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_role_valid"
  CHECK (role IN ('superadmin', 'district_admin', 'coordinator', 'school_user', 'viewer'));

-- 3. district_admin und coordinator brauchen district_id
--    accessControl.ts setzt district_id für diese Rollen voraus.
ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_district_required"
  CHECK (
    role NOT IN ('district_admin', 'coordinator')
    OR district_id IS NOT NULL
  );

-- 4. school_user braucht school_id
--    canCreateTrainingNeed prüft isOwnSchool — ohne school_id wäre die Rolle funktionslos.
ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_school_required"
  CHECK (
    role != 'school_user'
    OR school_id IS NOT NULL
  );

-- 5. updated_at-Trigger — tabellenspezifisch benannt, keine globale Funktion.
--    Verhindert, dass Application-Code updated_at selbst setzen muss.
CREATE OR REPLACE FUNCTION public.set_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_profiles_updated_at();