import type { AuditService } from '../audit/audit.service';
import { AppException } from '../common/exceptions/app.exception';
import type { PrismaService } from '../database/prisma.service';
import type { ActorContext } from '../organizations/organizations.service';
import { RolesService } from './roles.service';

describe('RolesService', () => {
  let prisma: {
    role: { findMany: jest.Mock; findFirst: jest.Mock };
    permission: { findMany: jest.Mock };
    rolePermission: { deleteMany: jest.Mock; createMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let audit: { record: jest.Mock };
  let service: RolesService;

  const actor: ActorContext = { actorId: 'user-1' };

  beforeEach(() => {
    prisma = {
      role: { findMany: jest.fn(), findFirst: jest.fn() },
      permission: { findMany: jest.fn() },
      rolePermission: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new RolesService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
    );
  });

  describe('findAll', () => {
    it('scopes roles to the organization and flattens permission keys/member counts', async () => {
      prisma.role.findMany.mockResolvedValue([
        {
          id: 'role-1',
          key: 'ORGANIZATION_ADMIN',
          name: 'Org Admin',
          description: null,
          isSystem: true,
          _count: { memberships: 3 },
          permissions: [
            { permission: { key: 'ORG_WRITE' } },
            { permission: { key: 'ORG_READ' } },
          ],
        },
      ]);

      const result = await service.findAll('org-1');

      expect(prisma.role.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: 'org-1' } }),
      );
      expect(result).toEqual([
        {
          id: 'role-1',
          key: 'ORGANIZATION_ADMIN',
          name: 'Org Admin',
          description: null,
          isSystem: true,
          memberCount: 3,
          permissions: ['ORG_READ', 'ORG_WRITE'],
        },
      ]);
    });
  });

  describe('findOne', () => {
    it('returns a role scoped to the organization', async () => {
      prisma.role.findFirst.mockResolvedValue({
        id: 'role-1',
        key: 'ORGANIZATION_ADMIN',
        name: 'Org Admin',
        description: null,
        isSystem: true,
        permissions: [{ permission: { key: 'ORG_WRITE', id: 'perm-1' } }],
      });

      const result = await service.findOne('org-1', 'role-1');

      expect(prisma.role.findFirst).toHaveBeenCalledWith({
        where: { id: 'role-1', organizationId: 'org-1' },
        include: expect.any(Object),
      });
      expect(result.permissions).toEqual([{ key: 'ORG_WRITE', id: 'perm-1' }]);
    });

    it('throws not-found for a role belonging to another organization, rather than leaking it', async () => {
      prisma.role.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('org-1', 'role-from-other-org'),
      ).rejects.toThrow(AppException);
    });
  });

  describe('updatePermissions', () => {
    function mockRole(permissions: { key: string; id: string }[]) {
      prisma.role.findFirst.mockResolvedValue({
        id: 'role-1',
        key: 'ORGANIZATION_ADMIN',
        name: 'Org Admin',
        description: null,
        isSystem: true,
        permissions: permissions.map((permission) => ({ permission })),
      });
    }

    it('rejects an unknown permission key without touching the database', async () => {
      mockRole([{ key: 'ORG_READ', id: 'perm-1' }]);
      prisma.permission.findMany.mockResolvedValue([
        { key: 'ORG_READ', id: 'perm-1' },
      ]);

      await expect(
        service.updatePermissions(
          'org-1',
          'role-1',
          { permissions: ['ORG_READ', 'NOT_A_REAL_PERMISSION'] } as never,
          actor,
        ),
      ).rejects.toThrow(AppException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('replaces the grant set transactionally and audits the before/after scope', async () => {
      mockRole([{ key: 'ORG_READ', id: 'perm-1' }]);
      prisma.permission.findMany.mockResolvedValue([
        { key: 'ORG_READ', id: 'perm-1' },
        { key: 'ORG_WRITE', id: 'perm-2' },
      ]);
      // Second findFirst call is the trailing this.findOne() re-read.
      prisma.role.findFirst.mockResolvedValueOnce({
        id: 'role-1',
        key: 'ORGANIZATION_ADMIN',
        name: 'Org Admin',
        description: null,
        isSystem: true,
        permissions: [{ permission: { key: 'ORG_READ', id: 'perm-1' } }],
      });
      prisma.role.findFirst.mockResolvedValueOnce({
        id: 'role-1',
        key: 'ORGANIZATION_ADMIN',
        name: 'Org Admin',
        description: null,
        isSystem: true,
        permissions: [
          { permission: { key: 'ORG_READ', id: 'perm-1' } },
          { permission: { key: 'ORG_WRITE', id: 'perm-2' } },
        ],
      });

      const result = await service.updatePermissions(
        'org-1',
        'role-1',
        {
          permissions: ['ORG_READ', 'ORG_WRITE'],
          reason: 'quarterly review',
        } as never,
        actor,
      );

      expect(prisma.rolePermission.deleteMany).toHaveBeenCalledWith({
        where: { roleId: 'role-1' },
      });
      expect(prisma.rolePermission.createMany).toHaveBeenCalledWith({
        data: [
          { roleId: 'role-1', permissionId: 'perm-1' },
          { roleId: 'role-1', permissionId: 'perm-2' },
        ],
        skipDuplicates: true,
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          category: 'ROLE',
          action: 'role.permissions_changed',
          before: { permissions: ['ORG_READ'] },
          after: { permissions: ['ORG_READ', 'ORG_WRITE'] },
          reason: 'quarterly review',
        }),
      );
      expect(result.permissions).toHaveLength(2);
    });

    it('throws not-found rather than mutating grants for a role outside the organization', async () => {
      prisma.role.findFirst.mockResolvedValue(null);

      await expect(
        service.updatePermissions(
          'org-1',
          'role-from-other-org',
          { permissions: ['ORG_READ'] } as never,
          actor,
        ),
      ).rejects.toThrow(AppException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
