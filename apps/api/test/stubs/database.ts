/**
 * Stands in for @afaq/database in unit tests.
 *
 * Unit tests check decisions, not storage, and every one of them passes in a
 * fake Prisma object. Without this stub they would need a generated Prisma
 * client, which means a database and a code-generation step before the fastest
 * tests in the project can run.
 *
 * End-to-end tests use the real package; see vitest.config.e2e.ts.
 */

export class PrismaClient {}

export function createPrismaClient(): PrismaClient {
  throw new Error('createPrismaClient is not available in unit tests. Pass a fake Prisma object.');
}

export type PrismaTransactionClient = PrismaClient;
