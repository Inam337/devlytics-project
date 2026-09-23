import type { AuditService } from '../audit/audit.service';
import { AppException } from '../common/exceptions/app.exception';
import type { PaginationQueryDto } from '../common/dto/pagination.dto';
import type { PrismaService } from '../database/prisma.service';
import type { ActorContext } from '../organizations/organizations.service';
import { DepartmentsService } from './departments.service';

describe('DepartmentsService', () => {
  let prisma: {
    department: {
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    organizationUser: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let audit: { record: jest.Mock };
  let service: DepartmentsService;

  const actor: ActorContext = { actorId: 'user-1' };
  const baseQuery: PaginationQueryDto = {
    page: 1,
    limit: 20,
    skip: 0,
    sortOrder: 'desc',
  } as unknown as PaginationQueryDto;

  beforeEach(() => {
    prisma = {
      department: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn().mockResolvedValue(undefined),
      },
      organizationUser: { findUnique: jest.fn() },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new DepartmentsService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
    );
  });

  describe('findAll', () => {
    it('scopes to the organization and maps the team count out of _count', async () => {
      prisma.department.findMany.mockResolvedValue([
        {
          id: 'dept-1',
          name: 'Engineering',
          code: 'ENG',
          _count: { teams: 4 },
        },
      ]);
      prisma.department.count.mockResolvedValue(1);

      const result = await service.findAll('org-1', baseQuery);

      expect(prisma.department.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: 'org-1' }),
        }),
      );
      expect(result.items).toEqual([
        { id: 'dept-1', name: 'Engineering', code: 'ENG', teamCount: 4 },
      ]);
    });
  });

  describe('findOne', () => {
    it('throws not-found for a department belonging to another organization', async () => {
      prisma.department.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('org-1', 'dept-from-other-org'),
      ).rejects.toThrow(AppException);
    });

    it('returns the department with its teams when found in-tenant', async () => {
      prisma.department.findFirst.mockResolvedValue({
        id: 'dept-1',
        name: 'Engineering',
        code: 'ENG',
        _count: { teams: 1 },
        teams: [{ id: 'team-1', name: 'Platform' }],
      });

      const result = await service.findOne('org-1', 'dept-1');

      expect(result.teamCount).toBe(1);
      expect(result.teams).toEqual([{ id: 'team-1', name: 'Platform' }]);
    });
  });

  describe('create', () => {
    it('rejects a manager who is not a member of the organization (tenant isolation)', async () => {
      prisma.organizationUser.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          'org-1',
          {
            name: 'Engineering',
            code: 'eng',
            managerId: 'user-from-other-org',
          } as never,
          actor,
        ),
      ).rejects.toThrow(AppException);
      expect(prisma.department.create).not.toHaveBeenCalled();
    });

    it('uppercases the code, creates the department and audits it', async () => {
      prisma.organizationUser.findUnique.mockResolvedValue({
        id: 'membership-1',
      });
      prisma.department.create.mockResolvedValue({
        id: 'dept-1',
        name: 'Engineering',
        code: 'ENG',
        managerId: 'user-1',
        _count: { teams: 0 },
      });

      const result = await service.create(
        'org-1',
        { name: 'Engineering', code: 'eng', managerId: 'user-1' } as never,
        actor,
      );

      expect(prisma.department.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 'org-1',
            code: 'ENG',
          }),
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'department.created',
          organizationId: 'org-1',
        }),
      );
      expect(result.teamCount).toBe(0);
    });

    it('allows creating a department with no manager', async () => {
      prisma.department.create.mockResolvedValue({
        id: 'dept-1',
        name: 'Engineering',
        code: 'ENG',
        managerId: null,
        _count: { teams: 0 },
      });

      await service.create(
        'org-1',
        { name: 'Engineering', code: 'eng' } as never,
        actor,
      );

      expect(prisma.organizationUser.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws not-found for a department outside the organization', async () => {
      prisma.department.findFirst.mockResolvedValue(null);

      await expect(
        service.update('org-1', 'dept-from-other-org', {} as never, actor),
      ).rejects.toThrow(AppException);
      expect(prisma.department.update).not.toHaveBeenCalled();
    });

    it('rejects reassigning to a manager outside the organization', async () => {
      prisma.department.findFirst.mockResolvedValue({
        id: 'dept-1',
        name: 'Engineering',
        code: 'ENG',
        managerId: null,
      });
      prisma.organizationUser.findUnique.mockResolvedValue(null);

      await expect(
        service.update(
          'org-1',
          'dept-1',
          { managerId: 'user-from-other-org' } as never,
          actor,
        ),
      ).rejects.toThrow(AppException);
      expect(prisma.department.update).not.toHaveBeenCalled();
    });

    it('audits before/after name and code on update', async () => {
      prisma.department.findFirst.mockResolvedValue({
        id: 'dept-1',
        name: 'Engineering',
        code: 'ENG',
        managerId: null,
      });
      prisma.department.update.mockResolvedValue({
        id: 'dept-1',
        name: 'Platform Engineering',
        code: 'PENG',
        managerId: null,
        _count: { teams: 0 },
      });

      await service.update(
        'org-1',
        'dept-1',
        { name: 'Platform Engineering', code: 'peng' } as never,
        actor,
      );

      expect(prisma.department.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'dept-1' },
          data: expect.objectContaining({
            name: 'Platform Engineering',
            code: 'PENG',
          }),
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'department.updated',
          before: expect.objectContaining({ name: 'Engineering', code: 'ENG' }),
          after: expect.objectContaining({
            name: 'Platform Engineering',
            code: 'PENG',
          }),
        }),
      );
    });
  });

  describe('remove', () => {
    it('throws not-found for a department outside the organization', async () => {
      prisma.department.findFirst.mockResolvedValue(null);

      await expect(
        service.remove('org-1', 'dept-from-other-org', actor),
      ).rejects.toThrow(AppException);
    });

    it('refuses to delete a department that still has teams attached', async () => {
      prisma.department.findFirst.mockResolvedValue({
        id: 'dept-1',
        name: 'Engineering',
        code: 'ENG',
        _count: { teams: 2 },
      });

      await expect(service.remove('org-1', 'dept-1', actor)).rejects.toThrow(
        AppException,
      );
      expect(prisma.department.delete).not.toHaveBeenCalled();
    });

    it('deletes an empty department and audits it', async () => {
      prisma.department.findFirst.mockResolvedValue({
        id: 'dept-1',
        name: 'Engineering',
        code: 'ENG',
        _count: { teams: 0 },
      });

      const result = await service.remove('org-1', 'dept-1', actor);

      expect(prisma.department.delete).toHaveBeenCalledWith({
        where: { id: 'dept-1' },
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'department.deleted' }),
      );
      expect(result).toEqual({ id: 'dept-1', deleted: true });
    });
  });
});
