import type { AuditService } from '../audit/audit.service';
import { AppException } from '../common/exceptions/app.exception';
import type { PrismaService } from '../database/prisma.service';
import { OrganizationsService } from './organizations.service';
import type { OrganizationsRepository } from './organizations.repository';

describe('OrganizationsService', () => {
  let prisma: { $transaction: jest.Mock };
  let tx: {
    organization: { create: jest.Mock };
    permission: { findMany: jest.Mock };
    role: { upsert: jest.Mock };
    rolePermission: { createMany: jest.Mock };
    scoringRule: { createMany: jest.Mock };
    aiProvider: { upsert: jest.Mock };
  };
  let repository: {
    findForUser: jest.Mock;
    findById: jest.Mock;
    findBySlug: jest.Mock;
    counts: jest.Mock;
    update: jest.Mock;
  };
  let audit: { record: jest.Mock };
  let service: OrganizationsService;

  beforeEach(() => {
    tx = {
      organization: {
        create: jest.fn().mockResolvedValue({
          id: 'org-1',
          name: 'Acme Corp',
          slug: 'acme-corp',
        }),
      },
      permission: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'perm-1', key: 'ORG_READ' },
          { id: 'perm-2', key: 'ORG_WRITE' },
        ]),
      },
      role: { upsert: jest.fn().mockResolvedValue({ id: 'role-1' }) },
      rolePermission: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
      scoringRule: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
      aiProvider: { upsert: jest.fn().mockResolvedValue({ id: 'provider-1' }) },
    };
    prisma = {
      $transaction: jest.fn(async (arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (t: unknown) => Promise<unknown>)(tx);
        }
        return Promise.all(arg as Promise<unknown>[]);
      }),
    };
    repository = {
      findForUser: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn().mockResolvedValue(null),
      counts: jest.fn().mockResolvedValue({
        users: 0,
        departments: 0,
        teams: 0,
        projects: 0,
        repositories: 0,
      }),
      update: jest.fn(),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };

    service = new OrganizationsService(
      prisma as unknown as PrismaService,
      repository as unknown as OrganizationsRepository,
      audit as unknown as AuditService,
    );
  });

  describe('create', () => {
    it('provisions roles/permissions, initial scoring weights and the local AI provider inside one transaction', async () => {
      const result = await service.create({ name: 'Acme Corp' } as never, {
        actorId: 'user-1',
      });

      expect(tx.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Acme Corp',
            slug: 'acme-corp',
          }),
        }),
      );
      expect(tx.role.upsert).toHaveBeenCalled();
      expect(tx.scoringRule.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              organizationId: 'org-1',
              weightVersion: 1,
            }),
          ]),
        }),
      );
      expect(tx.aiProvider.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId_providerType: {
              organizationId: 'org-1',
              providerType: 'OLLAMA',
            },
          },
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          action: 'organization.created',
        }),
      );
      expect(result).toEqual({
        id: 'org-1',
        name: 'Acme Corp',
        slug: 'acme-corp',
      });
    });

    it('slugifies the organization name and de-duplicates against an existing slug', async () => {
      repository.findBySlug.mockResolvedValueOnce({ id: 'other-org' }); // 'acme-corp' taken
      repository.findBySlug.mockResolvedValueOnce(null); // 'acme-corp-2' free

      await service.create({ name: 'Acme Corp!' } as never);

      expect(tx.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: 'acme-corp-2' }),
        }),
      );
    });

    it('throws if the permission catalog has not been seeded (reference data not synchronised)', async () => {
      tx.permission.findMany.mockResolvedValue([]);

      await expect(
        service.create({ name: 'Acme Corp' } as never),
      ).rejects.toThrow(AppException);
      expect(tx.scoringRule.createMany).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('forbids reading an organization other than the caller token organization', async () => {
      await expect(service.findOne('org-1', 'org-2')).rejects.toMatchObject({
        status: 403,
      });
      expect(repository.findById).not.toHaveBeenCalled();
    });

    it('throws not-found when the organization row is missing', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne('org-1', 'org-1')).rejects.toThrow(
        AppException,
      );
    });

    it('returns the organization merged with its header counts', async () => {
      repository.findById.mockResolvedValue({ id: 'org-1', name: 'Acme Corp' });
      repository.counts.mockResolvedValue({
        users: 5,
        departments: 1,
        teams: 2,
        projects: 3,
        repositories: 4,
      });

      const result = await service.findOne('org-1', 'org-1');

      expect(result).toEqual({
        id: 'org-1',
        name: 'Acme Corp',
        counts: {
          users: 5,
          departments: 1,
          teams: 2,
          projects: 3,
          repositories: 4,
        },
      });
    });
  });

  describe('update', () => {
    it('forbids updating an organization other than the caller token organization', async () => {
      await expect(
        service.update('org-1', 'org-2', {} as never, { actorId: 'user-1' }),
      ).rejects.toMatchObject({ status: 403 });
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('throws not-found when the organization does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.update('org-1', 'org-1', {} as never, { actorId: 'user-1' }),
      ).rejects.toThrow(AppException);
    });

    it('only re-derives the slug when a new slug is actually requested', async () => {
      repository.findById.mockResolvedValue({
        id: 'org-1',
        name: 'Acme Corp',
        slug: 'acme-corp',
      });
      repository.update.mockResolvedValue({
        id: 'org-1',
        name: 'Acme Corp',
        slug: 'acme-corp',
      });

      await service.update('org-1', 'org-1', { name: 'Acme Corp' } as never, {
        actorId: 'user-1',
      });

      expect(repository.findBySlug).not.toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalledWith(
        'org-1',
        expect.not.objectContaining({ slug: expect.anything() }),
      );
    });

    it('audits before/after excluding id/createdAt/updatedAt', async () => {
      repository.findById.mockResolvedValue({
        id: 'org-1',
        name: 'Acme Corp',
        slug: 'acme-corp',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      });
      repository.update.mockResolvedValue({
        id: 'org-1',
        name: 'Acme Renamed',
        slug: 'acme-corp',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-02-01'),
      });

      await service.update(
        'org-1',
        'org-1',
        { name: 'Acme Renamed' } as never,
        { actorId: 'user-1' },
      );

      const call = audit.record.mock.calls[0][0];
      expect(call.before).not.toHaveProperty('id');
      expect(call.before).not.toHaveProperty('createdAt');
      expect(call.after.name).toBe('Acme Renamed');
    });
  });

  describe('findAllForUser', () => {
    it('delegates straight to the repository', () => {
      service.findAllForUser('user-1');
      expect(repository.findForUser).toHaveBeenCalledWith('user-1');
    });
  });
});
