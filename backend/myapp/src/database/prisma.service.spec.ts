import type { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';

function configWith(values: Record<string, unknown>): ConfigService {
  return {
    get: (key: string, fallback?: unknown) =>
      key in values ? values[key] : fallback,
    getOrThrow: (key: string) => {
      if (!(key in values))
        throw new Error(`Missing config value for '${key}'`);
      return values[key];
    },
  } as unknown as ConfigService;
}

/**
 * PrismaService extends the generated PrismaClient, so these tests construct a
 * real instance (constructing it does not open a network connection — that only
 * happens on `$connect()` / the first query) and stub the inherited
 * `$connect`/`$disconnect`/`$queryRaw`/`$executeRawUnsafe` methods to verify the
 * lifecycle and health/reset logic this project layers on top, without a live
 * Postgres.
 */
describe('PrismaService', () => {
  const originalEnv = process.env.NODE_ENV;
  let service: PrismaService;

  beforeEach(() => {
    service = new PrismaService(
      configWith({
        'database.url': 'postgresql://user:pass@localhost:5432/devlytics_test',
        'app.env': 'test',
      }),
    );
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.restoreAllMocks();
  });

  describe('onModuleInit', () => {
    it('connects to the database', async () => {
      const connectSpy = jest
        .spyOn(service, '$connect')
        .mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(connectSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('onModuleDestroy', () => {
    it('disconnects from the database', async () => {
      const disconnectSpy = jest
        .spyOn(service, '$disconnect')
        .mockResolvedValue(undefined);

      await service.onModuleDestroy();

      expect(disconnectSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('isHealthy', () => {
    it('returns true when SELECT 1 succeeds', async () => {
      jest.spyOn(service, '$queryRaw').mockResolvedValue([{ '?column?': 1 }]);

      await expect(service.isHealthy()).resolves.toBe(true);
    });

    it('returns false, without throwing, when the query fails', async () => {
      jest
        .spyOn(service, '$queryRaw')
        .mockRejectedValue(new Error('connection refused'));

      await expect(service.isHealthy()).resolves.toBe(false);
    });
  });

  describe('resetForTests', () => {
    it('refuses to run outside NODE_ENV=test', async () => {
      process.env.NODE_ENV = 'production';

      await expect(service.resetForTests()).rejects.toThrow(
        'resetForTests() is only available when NODE_ENV=test',
      );
    });

    it('does nothing when there are no tbl_ tables', async () => {
      process.env.NODE_ENV = 'test';
      jest.spyOn(service, '$queryRaw').mockResolvedValue([]);
      const execSpy = jest
        .spyOn(service, '$executeRawUnsafe')
        .mockResolvedValue(0);

      await service.resetForTests();

      expect(execSpy).not.toHaveBeenCalled();
    });

    it('truncates every tbl_ table it finds, in one statement', async () => {
      process.env.NODE_ENV = 'test';
      jest
        .spyOn(service, '$queryRaw')
        .mockResolvedValue([
          { tablename: 'tbl_user' },
          { tablename: 'tbl_organization' },
        ]);
      const execSpy = jest
        .spyOn(service, '$executeRawUnsafe')
        .mockResolvedValue(0);

      await service.resetForTests();

      expect(execSpy).toHaveBeenCalledTimes(1);
      const statement = execSpy.mock.calls[0][0] as string;
      expect(statement).toContain('TRUNCATE TABLE');
      expect(statement).toContain('"public"."tbl_user"');
      expect(statement).toContain('"public"."tbl_organization"');
      expect(statement).toContain('RESTART IDENTITY CASCADE');
    });
  });
});
