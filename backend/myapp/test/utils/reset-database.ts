import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Truncates every domain table before the Nest app boots, so
 * `ReferenceDataService.onApplicationBootstrap()` re-seeds the permission
 * catalog and achievement definitions into a clean database as part of
 * `app.init()` — never call this after the app is already running, since
 * nothing re-syncs reference data on demand.
 */
export async function resetDatabase(): Promise<void> {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('resetDatabase() is only available when NODE_ENV=test');
  }

  const prisma = new PrismaClient();
  try {
    const tables = await prisma.$queryRaw<{ tablename: string }[]>(
      Prisma.sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'tbl_%'`,
    );
    if (tables.length > 0) {
      const list = tables
        .map(({ tablename }) => `"public"."${tablename}"`)
        .join(', ');
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}
