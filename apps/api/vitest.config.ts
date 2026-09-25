import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`.
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // Unit tests pass fake Prisma objects, so they do not need a generated
      // client — and should not need a database to run.
      '@afaq/database': fileURLToPath(new URL('./test/stubs/database.ts', import.meta.url)),
    },
  },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
  },
});
