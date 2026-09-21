import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

export interface CreatePrismaClientOptions {
  /** The pooled connection string (DATABASE_URL, port 6543). */
  connectionString: string;
  log?: boolean;
}

export function createPrismaClient({
  connectionString,
  log = false,
}: CreatePrismaClientOptions): PrismaClient {
  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log: log ? ['warn', 'error'] : ['error'],
  });
}

export { PrismaClient };
