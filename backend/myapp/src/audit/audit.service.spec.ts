import type { PrismaService } from '../database/prisma.service';
import { AppException } from '../common/exceptions/app.exception';
import { AuditService } from './audit.service';
import type { AuditLogQueryDto } from './dto/audit-log-query.dto';

describe('AuditService', () => {
  let prisma: {
    auditLog: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let service: AuditService;

  beforeEach(() => {
    prisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn(),
      },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    service = new AuditService(prisma as unknown as PrismaService);
  });

  describe('record', () => {
    it('writes an audit row with before/after JSON and returns without throwing', async () => {
      await service.record({
        organizationId: 'org-1',
        actorId: 'user-1',
        category: 'REPOSITORY',
        action: 'quality.scan_requested',
        summary: 'Quality scan requested',
        entityType: 'Repository',
        entityId: 'repo-1',
        before: { status: 'OPEN' },
        after: { status: 'RESOLVED' },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: 'org-1',
          actorId: 'user-1',
          category: 'REPOSITORY',
          action: 'quality.scan_requested',
          beforeValue: { status: 'OPEN' },
          afterValue: { status: 'RESOLVED' },
        }),
      });
    });

    it('omits beforeValue/afterValue when not provided, rather than writing null JSON', async () => {
      await service.record({
        organizationId: 'org-1',
        category: 'AUTH',
        action: 'user.login',
        summary: 'User logged in',
      });

      const data = prisma.auditLog.create.mock.calls[0][0].data;
      expect(data.beforeValue).toBeUndefined();
      expect(data.afterValue).toBeUndefined();
      expect(data.actorId).toBeNull();
    });

    it('swallows a write failure instead of propagating it to the caller', async () => {
      prisma.auditLog.create.mockRejectedValue(new Error('db down'));

      await expect(
        service.record({
          organizationId: 'org-1',
          category: 'AUTH',
          action: 'user.login',
          summary: 'User logged in',
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('findAll', () => {
    const baseQuery: AuditLogQueryDto = {
      page: 1,
      limit: 20,
      skip: 0,
      sortOrder: 'desc',
    } as unknown as AuditLogQueryDto;

    it('scopes to the organization and paginates the result', async () => {
      prisma.auditLog.findMany.mockResolvedValue([{ id: 'log-1' }]);
      prisma.auditLog.count.mockResolvedValue(1);

      const result = await service.findAll('org-1', baseQuery);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: 'org-1' }),
        }),
      );
      expect(result.items).toEqual([{ id: 'log-1' }]);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('applies category/actor/entityType filters and a date range when provided', async () => {
      await service.findAll('org-1', {
        ...baseQuery,
        category: 'AUTH',
        actorId: 'user-1',
        entityType: 'Repository',
        from: '2026-01-01',
        to: '2026-01-31',
      } as unknown as AuditLogQueryDto);

      const where = prisma.auditLog.findMany.mock.calls[0][0].where;
      expect(where).toEqual(
        expect.objectContaining({
          organizationId: 'org-1',
          category: 'AUTH',
          actorId: 'user-1',
          entityType: 'Repository',
          createdAt: {
            gte: new Date('2026-01-01'),
            lte: new Date('2026-01-31'),
          },
        }),
      );
    });

    it('turns a search term into an OR contains clause across summary and action', async () => {
      await service.findAll('org-1', {
        ...baseQuery,
        search: 'password',
      } as unknown as AuditLogQueryDto);

      const where = prisma.auditLog.findMany.mock.calls[0][0].where;
      expect(where.OR).toEqual([
        { summary: { contains: 'password', mode: 'insensitive' } },
        { action: { contains: 'password', mode: 'insensitive' } },
      ]);
    });

    it('rejects sorting by a column outside the whitelist', async () => {
      await expect(
        service.findAll('org-1', {
          ...baseQuery,
          sortBy: 'beforeValue',
        } as unknown as AuditLogQueryDto),
      ).rejects.toThrow(AppException);
    });
  });

  describe('findOne', () => {
    it('returns the entry scoped to the organization', async () => {
      prisma.auditLog.findFirst.mockResolvedValue({ id: 'log-1' });

      const result = await service.findOne('org-1', 'log-1');

      expect(prisma.auditLog.findFirst).toHaveBeenCalledWith({
        where: { id: 'log-1', organizationId: 'org-1' },
        include: expect.any(Object),
      });
      expect(result).toEqual({ id: 'log-1' });
    });

    it('throws not-found for an entry belonging to another organization', async () => {
      prisma.auditLog.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('org-1', 'log-from-other-org'),
      ).rejects.toThrow(AppException);
    });
  });
});
