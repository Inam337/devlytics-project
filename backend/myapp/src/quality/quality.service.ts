import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { PaginatedResult } from '../common/dto/pagination.dto';
import { AppException } from '../common/exceptions/app.exception';
import { NumberUtil } from '../common/utils/number.util';
import { QueryUtil } from '../common/utils/query.util';
import { PrismaService } from '../database/prisma.service';
import type { ActorContext } from '../organizations/organizations.service';
import { QUEUE } from '../queue/queue.constants';
import { safeEnqueue } from '../queue/queue.util';
import {
  QualityIssueQueryDto,
  QualitySnapshotQueryDto,
  TriggerScanDto,
  UpdateQualityIssueStatusDto,
} from './dto/quality.dto';

@Injectable()
export class QualityService {
  private readonly logger = new Logger(QualityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @InjectQueue(QUEUE.QUALITY_ANALYSIS) private readonly qualityQueue: Queue,
  ) {}

  /** Queues a fresh deterministic analysis run rather than blocking the request. */
  async triggerScan(
    organizationId: string,
    dto: TriggerScanDto,
    actor: ActorContext,
  ) {
    const repository = await this.prisma.repository.findFirst({
      where: { id: dto.repositoryId, organizationId },
      select: { id: true, fullName: true },
    });
    if (!repository)
      throw AppException.notFound('Repository', dto.repositoryId);

    const jobId = randomUUID();
    const queued = await safeEnqueue(
      this.qualityQueue,
      'analyze-repository',
      {
        organizationId,
        repositoryId: dto.repositoryId,
        requestedBy: actor.actorId,
      },
      this.logger,
      { jobId },
    );

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'REPOSITORY',
      action: 'quality.scan_requested',
      summary: `Quality scan requested for '${repository.fullName}'`,
      entityType: 'Repository',
      entityId: dto.repositoryId,
    });

    return { repositoryId: dto.repositoryId, queued, jobId };
  }

  async findSnapshots(organizationId: string, query: QualitySnapshotQueryDto) {
    const where: Prisma.CodeQualitySnapshotWhereInput = {
      organizationId,
      ...QueryUtil.compact({
        repositoryId: query.repositoryId,
        projectId: query.projectId,
      }),
      ...(query.from || query.to
        ? {
            snapshotDate: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.codeQualitySnapshot.findMany({
        where,
        orderBy: { snapshotDate: 'desc' },
        skip: query.skip,
        take: query.limit,
        include: {
          repository: { select: { id: true, name: true, fullName: true } },
        },
      }),
      this.prisma.codeQualitySnapshot.count({ where }),
    ]);

    return PaginatedResult.from(items.map(toSnapshotView), total, query);
  }

  /** Eight-KPI summary for the Code Quality screen, latest snapshot per repository. */
  async summary(organizationId: string, projectId?: string) {
    const repositories = await this.prisma.repository.findMany({
      where: {
        organizationId,
        isArchived: false,
        ...(projectId ? { projectId } : {}),
      },
      select: { id: true, name: true },
    });
    const repoIds = repositories.map((repo) => repo.id);
    if (repoIds.length === 0) {
      return {
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
      };
    }

    const snapshots = await this.prisma.codeQualitySnapshot.findMany({
      where: { organizationId, repositoryId: { in: repoIds } },
      orderBy: { snapshotDate: 'desc' },
    });
    const latest = new Map<string, (typeof snapshots)[number]>();
    for (const snapshot of snapshots) {
      if (!latest.has(snapshot.repositoryId))
        latest.set(snapshot.repositoryId, snapshot);
    }
    const values = [...latest.values()];

    const severityBreakdown = await this.prisma.codeQualityIssue.groupBy({
      by: ['severity'],
      where: {
        organizationId,
        repositoryId: { in: repoIds },
        status: { not: 'RESOLVED' },
      },
      _count: { _all: true },
    });

    return {
      qualityScore: NumberUtil.average(
        values.map((v) => NumberUtil.toNumber(v.qualityScore)),
      ),
      bugs: NumberUtil.sum(values.map((v) => v.bugs)),
      codeSmells: NumberUtil.sum(values.map((v) => v.codeSmells)),
      securityIssues: NumberUtil.sum(
        values.map((v) => v.vulnerabilities + v.securityHotspots),
      ),
      coveragePercent: NumberUtil.average(
        values.map((v) => NumberUtil.toNumber(v.coveragePercent)),
      ),
      duplicationPercent: NumberUtil.average(
        values.map((v) => NumberUtil.toNumber(v.duplicationPercent)),
      ),
      complexity: NumberUtil.average(
        values.map((v) => NumberUtil.toNumber(v.complexity)),
      ),
      maintainabilityScore: NumberUtil.average(
        values.map((v) => NumberUtil.toNumber(v.maintainabilityScore)),
      ),
      byRepository: repositories.map((repo) => {
        const snap = latest.get(repo.id);
        return {
          repository: repo,
          qualityScore: snap ? NumberUtil.toNumber(snap.qualityScore) : null,
          coveragePercent: snap
            ? NumberUtil.toNumber(snap.coveragePercent)
            : null,
        };
      }),
      severityBreakdown: severityBreakdown.map((row) => ({
        severity: row.severity,
        count: row._count._all,
      })),
    };
  }

  async findIssues(organizationId: string, query: QualityIssueQueryDto) {
    const where: Prisma.CodeQualityIssueWhereInput = {
      organizationId,
      ...QueryUtil.compact({
        repositoryId: query.repositoryId,
        category: query.category,
        severity: query.severity,
        status: query.status,
        assignedUserId: query.assignedUserId,
      }),
      ...QueryUtil.search(query.search, ['title', 'observedFact']),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.codeQualityIssue.findMany({
        where,
        orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
        skip: query.skip,
        take: query.limit,
        include: {
          repository: { select: { id: true, name: true, fullName: true } },
          recommendations: true,
        },
      }),
      this.prisma.codeQualityIssue.count({ where }),
    ]);

    return PaginatedResult.from(items.map(toIssueView), total, query);
  }

  async findIssueOne(organizationId: string, id: string) {
    const issue = await this.prisma.codeQualityIssue.findFirst({
      where: { id, organizationId },
      include: {
        repository: { select: { id: true, name: true, fullName: true } },
        recommendations: true,
        goals: { select: { id: true, status: true } },
      },
    });
    if (!issue) throw AppException.notFound('Quality issue', id);
    return toIssueView(issue);
  }

  async updateIssueStatus(
    organizationId: string,
    id: string,
    dto: UpdateQualityIssueStatusDto,
    actor: ActorContext,
  ) {
    const issue = await this.prisma.codeQualityIssue.findFirst({
      where: { id, organizationId },
    });
    if (!issue) throw AppException.notFound('Quality issue', id);

    const updated = await this.prisma.codeQualityIssue.update({
      where: { id },
      data: {
        status: dto.status,
        resolvedAt: dto.status === 'RESOLVED' ? new Date() : issue.resolvedAt,
      },
    });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'REPOSITORY',
      action: 'quality_issue.status_changed',
      summary: `Quality issue '${issue.title}' set to ${dto.status}`,
      entityType: 'CodeQualityIssue',
      entityId: id,
      before: { status: issue.status },
      after: { status: dto.status },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return updated;
  }
}

function toSnapshotView(
  snapshot: Prisma.CodeQualitySnapshotGetPayload<{
    include: { repository: true };
  }>,
) {
  return {
    ...snapshot,
    qualityScore: NumberUtil.toNumber(snapshot.qualityScore),
    coveragePercent: NumberUtil.toNumber(snapshot.coveragePercent),
    duplicationPercent: NumberUtil.toNumber(snapshot.duplicationPercent),
    complexity: NumberUtil.toNumber(snapshot.complexity),
    maintainabilityScore: NumberUtil.toNumber(snapshot.maintainabilityScore),
  };
}

function toIssueView(
  issue: Prisma.CodeQualityIssueGetPayload<Record<string, never>>,
) {
  return {
    ...issue,
    aiConfidence: issue.aiConfidence
      ? NumberUtil.toNumber(issue.aiConfidence)
      : null,
    measuredValue: issue.measuredValue
      ? NumberUtil.toNumber(issue.measuredValue)
      : null,
  };
}
