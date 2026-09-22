import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Application-wide PostgreSQL client. Connection details come from
 * `DATABASE_URL` only — nothing here is hardcoded.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService) {
    super({
      datasources: { db: { url: config.getOrThrow<string>('database.url') } },
      log:
        config.get<string>('app.env') === 'development'
          ? [
              { emit: 'event', level: 'warn' },
              { emit: 'event', level: 'error' },
            ]
          : [{ emit: 'event', level: 'error' }],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Connected to PostgreSQL');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /** Reports database reachability for the health endpoint. */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database health check failed', error as Error);
      return false;
    }
  }

  /**
   * Truncates every domain table. Test-suite only; refuses to run outside the
   * test environment so it can never touch a real database.
   */
  async resetForTests(): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('resetForTests() is only available when NODE_ENV=test');
    }
    const tables = await this.$queryRaw<{ tablename: string }[]>(
      Prisma.sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'tbl_%'`,
    );
    if (tables.length === 0) return;
    const list = tables
      .map(({ tablename }) => `"public"."${tablename}"`)
      .join(', ');
    await this.$executeRawUnsafe(
      `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`,
    );
  }
}
