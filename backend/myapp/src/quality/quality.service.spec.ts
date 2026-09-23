import { Prisma } from '@prisma/client';
import type { Queue } from 'bullmq';
import type { AuditService } from '../audit/audit.service';
import { AppException } from '../common/exceptions/app.exception';
import type { PrismaService } from '../database/prisma.service';
import type { ActorContext } from '../organizations/organizations.service';
import { QualityService } from './quality.service';

describe('QualityService', () => {
  let prisma: {
    repository: { findFirst: jest.Mock; findMany: jest.Mock };
    codeQualitySnapshot: { findMany: jest.Mock };
    codeQualityIssue: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
      groupBy: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let audit: { record: jest.Mock };
  let queue: { add: jest.Mock };
  let service: QualityService;

  const actor: ActorContext = { actorId: 'user-1' } as ActorContext;

  beforeEach(() => {
    prisma = {
      repository: { findFirst: jest.fn(), findMany: jest.fn() },
      codeQualitySnapshot: { findMany: jest.fn() },
      codeQualityIssue: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        groupBy: jest.fn(),
      },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    queue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };

    service = new QualityService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
      queue as unknown as Queue,
    );
  });

  describe('triggerScan', () => {
    it('enqueues an analyze-repository job, audits the request and returns the jobId', async () => {
      prisma.repository.findFirst.mockResolvedValue({
        id: 'repo-1',
        fullName: 'devlytics-demo/customer-portal-web',
      });

      const result = await service.triggerScan(
        'org-1',
        { repositoryId: 'repo-1' },
        actor,
      );

      expect(prisma.repository.findFirst).toHaveBeenCalledWith({
        where: { id: 'repo-1', organizationId: 'org-1' },
        select: { id: true, fullName: true },
      });
      expect(queue.add).toHaveBeenCalledWith(
        'analyze-repository',
        expect.objectContaining({
          organizationId: 'org-1',
          repositoryId: 'repo-1',
          requestedBy: 'user-1',
        }),
        expect.objectContaining({ jobId: expect.any(String) }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          actorId: 'user-1',
          category: 'REPOSITORY',
          action: 'quality.scan_requested',
          entityType: 'Repository',
          entityId: 'repo-1',
        }),
      );
      expect(result).toEqual({
        repositoryId: 'repo-1',
        queued: true,
        jobId: expect.any(String),
      });
    });

    it('rejects a repository that does not belong to the organization (tenant isolation)', async () => {
      prisma.repository.findFirst.mockResolvedValue(null);

      await expect(
        service.triggerScan(
          'org-1',
          { repositoryId: 'repo-from-other-org' },
          actor,
        ),
      ).rejects.toThrow(AppException);
      expect(queue.add).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('still returns queued: false and records the audit entry when the queue enqueue fails', async () => {
      prisma.repository.findFirst.mockResolvedValue({
        id: 'repo-1',
        fullName: 'org/repo',
      });
      queue.add.mockRejectedValue(new Error('redis down'));

      const result = await service.triggerScan(
        'org-1',
        { repositoryId: 'repo-1' },
        actor,
      );

      expect(result.queued).toBe(false);
      expect(audit.record).toHaveBeenCalled();
    });
  });

  describe('summary', () => {
    it('returns zeroed KPIs and no rows when the organization has no non-archived repositories', async () => {
      prisma.repository.findMany.mockResolvedValue([]);

      const result = await service.summary('org-1');

      expect(result).toEqual({
        qualityScore: 0,
        bugs: 0,
        codeSmells: 0,
        securityIssues: 0,
        coveragePercent: 0,
        duplicationPercent: 0,
        complexity: 0,
        maintainabilityScore: 0,
        byRepository: [],
        severityBreakdown: [],
      });
      expect(prisma.codeQualitySnapshot.findMany).not.toHaveBeenCalled();
    });

    it('scopes repositories to the organization and excludes archived ones', async () => {
      prisma.repository.findMany.mockResolvedValue([]);

      await service.summary('org-1', 'project-1');

      expect(prisma.repository.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          isArchived: false,
          projectId: 'project-1',
        },
        select: { id: true, name: true },
      });
    });

    it('aggregates using only the latest snapshot per repository and sums security issues from vulnerabilities + hotspots', async () => {
      prisma.repository.findMany.mockResolvedValue([
        { id: 'repo-1', name: 'repo-1' },
        { id: 'repo-2', name: 'repo-2' },
      ]);
      prisma.codeQualitySnapshot.findMany.mockResolvedValue([
        // repo-1: two snapshots, most-recent-first — only the first should count.
        {
          repositoryId: 'repo-1',
          snapshotDate: new Date('2026-02-01'),
          qualityScore: new Prisma.Decimal(90),
          bugs: 1,
          codeSmells: 2,
          vulnerabilities: 1,
          securityHotspots: 1,
          coveragePercent: new Prisma.Decimal(80),
          duplicationPercent: new Prisma.Decimal(5),
          complexity: new Prisma.Decimal(10),
          maintainabilityScore: new Prisma.Decimal(95),
        },
        {
          repositoryId: 'repo-1',
          snapshotDate: new Date('2026-01-01'),
          qualityScore: new Prisma.Decimal(50),
          bugs: 100,
          codeSmells: 100,
          vulnerabilities: 100,
          securityHotspots: 100,
          coveragePercent: new Prisma.Decimal(10),
          duplicationPercent: new Prisma.Decimal(50),
          complexity: new Prisma.Decimal(50),
          maintainabilityScore: new Prisma.Decimal(10),
        },
        {
          repositoryId: 'repo-2',
          snapshotDate: new Date('2026-02-01'),
          qualityScore: new Prisma.Decimal(70),
          bugs: 3,
          codeSmells: 4,
          vulnerabilities: 0,
          securityHotspots: 2,
          coveragePercent: new Prisma.Decimal(60),
          duplicationPercent: new Prisma.Decimal(15),
          complexity: new Prisma.Decimal(20),
          maintainabilityScore: new Prisma.Decimal(85),
        },
      ]);
      prisma.codeQualityIssue.groupBy.mockResolvedValue([
        { severity: 'HIGH', _count: { _all: 3 } },
        { severity: 'LOW', _count: { _all: 5 } },
      ]);

      const result = await service.summary('org-1');

      expect(result.qualityScore).toBe(80); // average(90, 70)
      expect(result.bugs).toBe(4); // 1 + 3
      expect(result.codeSmells).toBe(6); // 2 + 4
      expect(result.securityIssues).toBe(4); // (1+1) + (0+2)
      expect(result.byRepository).toEqual([
        expect.objectContaining({
          repository: { id: 'repo-1', name: 'repo-1' },
          qualityScore: 90,
          coveragePercent: 80,
        }),
        expect.objectContaining({
          repository: { id: 'repo-2', name: 'repo-2' },
          qualityScore: 70,
          coveragePercent: 60,
        }),
      ]);
      expect(result.severityBreakdown).toEqual([
        { severity: 'HIGH', count: 3 },
        { severity: 'LOW', count: 5 },
      ]);
      expect(prisma.codeQualityIssue.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-1',
            repositoryId: { in: ['repo-1', 'repo-2'] },
            status: { not: 'RESOLVED' },
          }),
        }),
      );
    });

    it('reports null scores for a repository with no snapshot yet, rather than zero', async () => {
      prisma.repository.findMany.mockResolvedValue([
        { id: 'repo-1', name: 'repo-1' },
      ]);
      prisma.codeQualitySnapshot.findMany.mockResolvedValue([]);
      prisma.codeQualityIssue.groupBy.mockResolvedValue([]);

      const result = await service.summary('org-1');

      expect(result.byRepository).toEqual([
        {
          repository: { id: 'repo-1', name: 'repo-1' },
          qualityScore: null,
          coveragePercent: null,
        },
      ]);
    });
  });

  describe('findIssueOne', () => {
    it('returns the issue when it belongs to the organization', async () => {
      prisma.codeQualityIssue.findFirst.mockResolvedValue({
        id: 'issue-1',
        organizationId: 'org-1',
        title: 'N+1 query',
        aiConfidence: null,
        measuredValue: new Prisma.Decimal(12.5),
      });

      const result = await service.findIssueOne('org-1', 'issue-1');

      expect(prisma.codeQualityIssue.findFirst).toHaveBeenCalledWith({
        where: { id: 'issue-1', organizationId: 'org-1' },
        include: expect.any(Object),
      });
      expect(result.measuredValue).toBe(12.5);
    });

    it('throws not-found rather than leaking a cross-tenant issue', async () => {
      prisma.codeQualityIssue.findFirst.mockResolvedValue(null);

      await expect(
        service.findIssueOne('org-1', 'issue-from-other-org'),
      ).rejects.toThrow(AppException);
    });
  });

  describe('updateIssueStatus', () => {
    it('throws not-found for an issue outside the caller organization', async () => {
      prisma.codeQualityIssue.findFirst.mockResolvedValue(null);

      await expect(
        service.updateIssueStatus(
          'org-1',
          'issue-1',
          { status: 'RESOLVED' } as never,
          actor,
        ),
      ).rejects.toThrow(AppException);
      expect(prisma.codeQualityIssue.update).not.toHaveBeenCalled();
    });

    it('sets resolvedAt when transitioning to RESOLVED and audits the before/after status', async () => {
      prisma.codeQualityIssue.findFirst.mockResolvedValue({
        id: 'issue-1',
        organizationId: 'org-1',
        title: 'N+1 query',
        status: 'OPEN',
        resolvedAt: null,
      });
      prisma.codeQualityIssue.update.mockResolvedValue({
        id: 'issue-1',
        status: 'RESOLVED',
      });

      await service.updateIssueStatus(
        'org-1',
        'issue-1',
        { status: 'RESOLVED' } as never,
        actor,
      );

      expect(prisma.codeQualityIssue.update).toHaveBeenCalledWith({
        where: { id: 'issue-1' },
        data: { status: 'RESOLVED', resolvedAt: expect.any(Date) },
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'quality_issue.status_changed',
          before: { status: 'OPEN' },
          after: { status: 'RESOLVED' },
        }),
      );
    });

    it('leaves resolvedAt untouched when the new status is not RESOLVED', async () => {
      const existingResolvedAt = new Date('2026-01-01');
      prisma.codeQualityIssue.findFirst.mockResolvedValue({
        id: 'issue-1',
        organizationId: 'org-1',
        title: 'N+1 query',
        status: 'RESOLVED',
        resolvedAt: existingResolvedAt,
      });
      prisma.codeQualityIssue.update.mockResolvedValue({
        id: 'issue-1',
        status: 'IN_PROGRESS',
      });

      await service.updateIssueStatus(
        'org-1',
        'issue-1',
        { status: 'IN_PROGRESS' } as never,
        actor,
      );

      expect(prisma.codeQualityIssue.update).toHaveBeenCalledWith({
        where: { id: 'issue-1' },
        data: { status: 'IN_PROGRESS', resolvedAt: existingResolvedAt },
      });
    });
  });
});
