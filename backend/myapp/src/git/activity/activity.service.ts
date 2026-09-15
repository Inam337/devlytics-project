import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { QueryUtil } from '../../common/utils/query.util';
import { PrismaService } from '../../database/prisma.service';
import { RepositoriesRepository } from '../repositories/repositories.repository';
import { ActivityQueryDto } from '../repositories/dto/repository.dto';

const AUTHOR_SELECT = {
  select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
};

/**
 * Read side of the engineering-activity tables. Every method resolves the
 * repository through the tenant repository first, so a repository belonging to
 * another organization is a 404 rather than a leak.
 */
@Injectable()
export class ActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repositories: RepositoriesRepository,
  ) {}

  async commits(organizationId: string, repositoryId: string, query: ActivityQueryDto) {
    await this.repositories.findByIdOrFail(organizationId, repositoryId);

    const where: Prisma.CommitWhereInput = {
      organizationId,
      repositoryId,
      ...(query.includeBots ? {} : { isBot: false }),
      ...QueryUtil.compact({ authorId: query.userId, branchName: query.branch }),
      ...dateRange('committedAt', query.from, query.to),
      ...(query.search ? { message: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.commit.findMany({
        where,
        orderBy: { committedAt: query.sortOrder },
        skip: query.skip,
        take: query.limit,
        include: { author: AUTHOR_SELECT },
      }),
      this.prisma.commit.count({ where }),
    ]);

    return PaginatedResult.from(items, total, query);
  }

  async pullRequests(organizationId: string, repositoryId: string, query: ActivityQueryDto) {
    await this.repositories.findByIdOrFail(organizationId, repositoryId);

    const where: Prisma.PullRequestWhereInput = {
      organizationId,
      repositoryId,
      ...QueryUtil.compact({
        authorId: query.userId,
        status: query.status as Prisma.PullRequestWhereInput['status'],
      }),
      ...dateRange('createdAtExternal', query.from, query.to),
      ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.pullRequest.findMany({
        where,
        orderBy: { createdAtExternal: query.sortOrder },
        skip: query.skip,
        take: query.limit,
        include: { author: AUTHOR_SELECT, _count: { select: { reviews: true } } },
      }),
      this.prisma.pullRequest.count({ where }),
    ]);

    return PaginatedResult.from(items, total, query);
  }

  async reviews(organizationId: string, repositoryId: string, query: ActivityQueryDto) {
    await this.repositories.findByIdOrFail(organizationId, repositoryId);

    const where: Prisma.PullRequestReviewWhereInput = {
      organizationId,
      pullRequest: { repositoryId },
      ...QueryUtil.compact({
        reviewerId: query.userId,
        state: query.status as Prisma.PullRequestReviewWhereInput['state'],
      }),
      ...dateRange('submittedAt', query.from, query.to),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.pullRequestReview.findMany({
        where,
        orderBy: { submittedAt: query.sortOrder },
        skip: query.skip,
        take: query.limit,
        include: {
          reviewer: AUTHOR_SELECT,
          pullRequest: { select: { id: true, number: true, title: true } },
        },
      }),
      this.prisma.pullRequestReview.count({ where }),
    ]);

    return PaginatedResult.from(items, total, query);
  }

  async issues(organizationId: string, repositoryId: string, query: ActivityQueryDto) {
    await this.repositories.findByIdOrFail(organizationId, repositoryId);

    const where: Prisma.IssueWhereInput = {
      organizationId,
      repositoryId,
      ...QueryUtil.compact({
        creatorId: query.userId,
        status: query.status as Prisma.IssueWhereInput['status'],
      }),
      ...dateRange('createdAtExternal', query.from, query.to),
      ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.issue.findMany({
        where,
        orderBy: { createdAtExternal: query.sortOrder },
        skip: query.skip,
        take: query.limit,
        include: { creator: AUTHOR_SELECT, assignee: AUTHOR_SELECT },
      }),
      this.prisma.issue.count({ where }),
    ]);

    return PaginatedResult.from(items, total, query);
  }

  async pipelines(organizationId: string, repositoryId: string, query: ActivityQueryDto) {
    await this.repositories.findByIdOrFail(organizationId, repositoryId);

    const where: Prisma.CiPipelineWhereInput = {
      organizationId,
      repositoryId,
      ...QueryUtil.compact({
        branchName: query.branch,
        status: query.status as Prisma.CiPipelineWhereInput['status'],
      }),
      ...dateRange('createdAt', query.from, query.to),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.ciPipeline.findMany({
        where,
        orderBy: { createdAt: query.sortOrder },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.ciPipeline.count({ where }),
    ]);

    // Run separately: mixing groupBy with findMany/count in one $transaction
    // tuple collapses Prisma's per-call return-type inference.
    const summary = await this.prisma.ciPipeline.groupBy({
      by: ['status'],
      where,
      orderBy: { status: 'asc' },
      _count: true,
    });

    const succeeded = summary.find((row) => row.status === 'SUCCESS')?._count ?? 0;
    const finished = summary
      .filter((row) => row.status === 'SUCCESS' || row.status === 'FAILED')
      .reduce((count, row) => count + (row._count ?? 0), 0);

    return PaginatedResult.from(
      items.map((item) => ({
        ...item,
        successRate: finished ? Math.round((succeeded / finished) * 1000) / 10 : null,
      })),
      total,
      query,
    );
  }

  async deployments(organizationId: string, repositoryId: string, query: ActivityQueryDto) {
    await this.repositories.findByIdOrFail(organizationId, repositoryId);

    const where: Prisma.DeploymentWhereInput = {
      organizationId,
      repositoryId,
      ...QueryUtil.compact({ status: query.status as Prisma.DeploymentWhereInput['status'] }),
      ...dateRange('deployedAt', query.from, query.to),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.deployment.findMany({
        where,
        orderBy: { deployedAt: query.sortOrder },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.deployment.count({ where }),
    ]);

    return PaginatedResult.from(items, total, query);
  }
}

function dateRange(field: string, from?: string, to?: string): Record<string, unknown> {
  if (!from && !to) return {};
  return {
    [field]: {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    },
  };
}
