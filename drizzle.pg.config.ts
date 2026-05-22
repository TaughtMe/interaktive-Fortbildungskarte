import { defineConfig } from 'drizzle-kit';

const databaseUrl = process.env.DATABASE_URL?.trim();

export default defineConfig({
  schema: './src/lib/db/schema.pg.ts',
  out: './drizzle-pg/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Safe placeholder: generation/checks can load this config without a real
    // Supabase connection. Migration commands must provide DATABASE_URL bewusst.
    url: databaseUrl && databaseUrl.length > 0
      ? databaseUrl
      : 'postgresql://missing-database-url.invalid:5432/not-configured',
  },
  strict: true,
  verbose: true,
});
