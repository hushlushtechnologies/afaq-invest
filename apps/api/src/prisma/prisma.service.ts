import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPrismaClient, type PrismaClient } from '@afaq/database';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private client!: PrismaClient;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const connectionString = this.config.get<string>('databaseUrl');

    if (!connectionString) {
      throw new Error('DATABASE_URL is not configured.');
    }

    this.client = createPrismaClient({
      connectionString,
      log: this.config.get<string>('nodeEnv') === 'development',
    });

    await this.client.$connect();
    this.logger.log('Prisma connected to PostgreSQL');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.$disconnect();
  }

  /** The Prisma client. Use in services: this.prisma.db.someModel.findMany() */
  get db(): PrismaClient {
    return this.client;
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.client.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
