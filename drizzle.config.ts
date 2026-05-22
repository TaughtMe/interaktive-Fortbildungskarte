import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? 'local-placeholder',
    databaseId: process.env.CLOUDFLARE_DATABASE_ID ?? 'local-placeholder',
    token: process.env.CLOUDFLARE_D1_TOKEN ?? 'local-placeholder',
  },
  strict: true,
  verbose: true,
});
