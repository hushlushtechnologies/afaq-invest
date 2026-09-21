import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Prisma CLI configuration.
 *
 * The CLI (migrate, studio, introspection) connects with DIRECT_URL — port
 * 5432 — because migrations cannot run through Supabase's connection pooler.
 * The running application connects with DATABASE_URL (the pooler, port 6543)
 * through the driver adapter in src/client.ts.
 *
 * DIRECT_URL is read without throwing, so `prisma generate` still works on a
 * machine or CI step that has no database credentials.
 */
const directUrl = process.env.DIRECT_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  ...(directUrl ? { datasource: { url: directUrl } } : {}),
});
