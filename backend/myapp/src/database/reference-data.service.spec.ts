import type { PrismaService } from './prisma.service';
import {
  ACHIEVEMENT_CATALOG,
  ReferenceDataService,
} from './reference-data.service';

describe('ReferenceDataService', () => {
  let prisma: {
    $transaction: jest.Mock;
    permission: { upsert: jest.Mock };
    achievement: { upsert: jest.Mock };
  };
  let service: ReferenceDataService;
  const originalSkip = process.env.SKIP_REFERENCE_DATA;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
      permission: { upsert: jest.fn().mockResolvedValue({}) },
      achievement: { upsert: jest.fn().mockResolvedValue({}) },
    };
    service = new ReferenceDataService(prisma as unknown as PrismaService);
  });

  afterEach(() => {
    process.env.SKIP_REFERENCE_DATA = originalSkip;
  });

  describe('sync', () => {
    it('upserts the whole permission catalog and the whole achievement catalog', async () => {
      await service.sync();

      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
      expect(prisma.permission.upsert).toHaveBeenCalled();
      expect(prisma.achievement.upsert).toHaveBeenCalledTimes(
        ACHIEVEMENT_CATALOG.length,
      );
    });

    it('upserts each achievement keyed by its catalog key, carrying its target and points', async () => {
      await service.sync();

      const firstCall = prisma.achievement.upsert.mock.calls.find(
        ([args]: [{ where: { key: string } }]) =>
          args.where.key === 'first_commit',
      );
      expect(firstCall[0]).toEqual(
        expect.objectContaining({
          where: { key: 'first_commit' },
          update: expect.objectContaining({ targetValue: 1, points: 5 }),
          create: expect.objectContaining({
            key: 'first_commit',
            targetValue: 1,
            points: 5,
          }),
        }),
      );
    });
  });

  describe('onApplicationBootstrap', () => {
    it('syncs reference data on boot by default', async () => {
      delete process.env.SKIP_REFERENCE_DATA;
      const syncSpy = jest.spyOn(service, 'sync').mockResolvedValue(undefined);

      await service.onApplicationBootstrap();

      expect(syncSpy).toHaveBeenCalledTimes(1);
    });

    it('skips the sync when SKIP_REFERENCE_DATA=true (used by the e2e/test bootstrap)', async () => {
      process.env.SKIP_REFERENCE_DATA = 'true';
      const syncSpy = jest.spyOn(service, 'sync').mockResolvedValue(undefined);

      await service.onApplicationBootstrap();

      expect(syncSpy).not.toHaveBeenCalled();
    });
  });
});
