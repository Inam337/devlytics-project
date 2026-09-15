import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { AppException } from '../../common/exceptions/app.exception';
import { NumberUtil } from '../../common/utils/number.util';
import { QueryUtil } from '../../common/utils/query.util';
import { PrismaService } from '../../database/prisma.service';
import type { ActorContext } from '../../organizations/organizations.service';
import { RepositoryQueryDto, UpdateRepositoryDto } from './dto/repository.dto';
import { REPOSITORY_INCLUDE, RepositoriesRepository } from './repositories.repository';

const SORTABLE = ['name', 'fullName', 'lastSyncAt', 'createdAt', 'syncStatus'] as const;

@Injectable()
export class RepositoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: RepositoriesRepository,
    private readonly audit: AuditService,
  ) {}

  async findAll(organizationId: string, query: RepositoryQueryDto) {
    const where: Prisma.RepositoryWhereInput = {
      organizationId,
      ...QueryUtil.compact({
        providerId: query.providerId,
        projectId: query.projectId,
        teamId: query.teamId,
        syncStatus: query.syncStatus,
        language: query.language,
      }),
      ...(query.includeArchived ? {} : { isArchived: false }),
      ...QueryUtil.search(query.search, ['name', 'fullName', 'description']),
    };

    const [repositories, total] = await this.prisma.$transaction([
      this.prisma.repository.findMany({
        where,
        orderBy: QueryUtil.orderBy(query.sortBy, query.sortOrder, SORTABLE, 'name'),
        skip: query.skip,
        take: query.limit,
        include: REPOSITORY_INCLUDE,
      }),
      this.prisma.repository.count({ where }),
    ]);

    const snapshots = await this.repository.latestSnapshots(
      organizationId,
      repositories.map((repo) => repo.id),
    );

    return PaginatedResult.from(
      repositories.map((repo) => toView(repo, snapshots.get(repo.id))),
      total,
      query,
    );
  }

  async findOne(organizationId: string, id: string) {
    const repository = await this.prisma.repository.findFirst({
      where: { id, organizationId },
      include: REPOSITORY_INCLUDE,
    });
    if (!repository) throw AppException.notFound('Repository', id);

    const snapshots = await this.repository.latestSnapshots(organizationId, [id]);
    const contributors = await this.topContributors(organizationId, id);
    const coverageTrend = await this.coverageTrend(organizationId, id);

    return {
      ...toView(repository, snapshots.get(id)),
      topContributors: contributors,
      coverageTrend,
    };
  }

  async update(organizationId: string, id: string, dto: UpdateRepositoryDto, actor: ActorContext) {
    const existing = await this.repository.findByIdOrFail(organizationId, id);

    if (dto.projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: dto.projectId, organizationId },
        select: { id: true },
      });
      if (!project) throw AppException.notFound('Project', dto.projectId);
    }
    if (dto.teamId) {
      const team = await this.prisma.team.findFirst({
        where: { id: dto.teamId, organizationId },
        select: { id: true },
      });
      if (!team) throw AppException.notFound('Team', dto.teamId);
    }

    await this.prisma.repository.update({
      where: { id },
      data: QueryUtil.compact({ projectId: dto.projectId, teamId: dto.teamId }),
    });

    // Snapshots follow the repository so project quality rolls up correctly.
    if (dto.projectId) {
      await this.prisma.codeQualitySnapshot.updateMany({
        where: { organizationId, repositoryId: id },
        data: { projectId: dto.projectId },
      });
    }

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'REPOSITORY',
      action: 'repository.updated',
      summary: `Repository '${existing.fullName}' reassigned`,
      entityType: 'Repository',
      entityId: id,
      before: { projectId: existing.projectId, teamId: existing.teamId },
      after: { projectId: dto.projectId, teamId: dto.teamId },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return this.findOne(organizationId, id);
  }

  async findMembers(organizationId: string, repositoryId: string) {
    await this.repository.findByIdOrFail(organizationId, repositoryId);
    return this.prisma.repositoryMember.findMany({
      where: { organizationId, repositoryId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { contributions: 'desc' },
    });
  }

  /** Contributor board on the repository detail screen; bots are excluded. */
  private async topContributors(organizationId: string, repositoryId: string, take = 5) {
    const grouped = await this.prisma.commit.groupBy({
      by: ['authorId'],
      where: { organizationId, repositoryId, authorId: { not: null }, isBot: false },
      _count: { _all: true },
      _sum: { additions: true, deletions: true },
      orderBy: { _count: { authorId: 'desc' } },
      take,
    });

    const userIds = grouped.map((row) => row.authorId).filter((id): id is string => Boolean(id));
    if (userIds.length === 0) return [];

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, avatarUrl: true },
    });
    const byId = new Map(users.map((user) => [user.id, user]));

    return grouped.map((row) => ({
      user: byId.get(row.authorId as string) ?? null,
      commits: row._count._all,
      // LOC is reported as activity only and never contributes to a score.
      linesAdded: row._sum.additions ?? 0,
      linesRemoved: row._sum.deletions ?? 0,
    }));
  }

  private async coverageTrend(organizationId: string, repositoryId: string, take = 30) {
    const snapshots = await this.prisma.codeQualitySnapshot.findMany({
      where: { organizationId, repositoryId },
      orderBy: { snapshotDate: 'desc' },
      take,
      select: {
        snapshotDate: true,
        coveragePercent: true,
        qualityScore: true,
        duplicationPercent: true,
      },
    });

    return snapshots.reverse().map((snapshot) => ({
      date: snapshot.snapshotDate.toISOString().slice(0, 10),
      coveragePercent: NumberUtil.toNumber(snapshot.coveragePercent),
      qualityScore: NumberUtil.toNumber(snapshot.qualityScore),
      duplicationPercent: NumberUtil.toNumber(snapshot.duplicationPercent),
    }));
  }
}

type LatestSnapshot = {
  qualityScore: Prisma.Decimal;
  coveragePercent: Prisma.Decimal;
  duplicationPercent: Prisma.Decimal;
  locTotal: number;
  snapshotDate: Date;
  bugs: number;
  codeSmells: number;
  vulnerabilities: number;
} | null;

function toView(
  repository: Prisma.RepositoryGetPayload<{ include: typeof REPOSITORY_INCLUDE }>,
  snapshot?: LatestSnapshot,
) {
  const { _count, ...rest } = repository;
  return {
    ...rest,
    commitCount: _count.commits,
    pullRequestCount: _count.pullRequests,
    issueCount: _count.issues,
    qualityScore: snapshot ? NumberUtil.toNumber(snapshot.qualityScore) : null,
    coveragePercent: snapshot ? NumberUtil.toNumber(snapshot.coveragePercent) : null,
    duplicationPercent: snapshot ? NumberUtil.toNumber(snapshot.duplicationPercent) : null,
    bugs: snapshot?.bugs ?? null,
    codeSmells: snapshot?.codeSmells ?? null,
    vulnerabilities: snapshot?.vulnerabilities ?? null,
    linesOfCode: snapshot?.locTotal ?? null,
    // Every surface exposes its own freshness so a stale value is never read as current.
    qualityMeasuredAt: snapshot?.snapshotDate ?? null,
    isStale:
      repository.syncStatus === 'FAILED' ||
      repository.syncStatus === 'DISCONNECTED' ||
      repository.syncStatus === 'PARTIAL',
  };
}
