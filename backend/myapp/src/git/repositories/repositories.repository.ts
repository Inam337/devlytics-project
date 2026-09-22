import { Injectable } from '@nestjs/common';
import { Prisma, Repository } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  ModelDelegate,
  TenantRepository,
} from '../../database/tenant.repository';

export const REPOSITORY_INCLUDE = {
  provider: {
    select: { id: true, providerType: true, displayName: true, status: true },
  },
  project: { select: { id: true, name: true, code: true } },
  team: { select: { id: true, name: true, code: true, teamColor: true } },
  _count: { select: { commits: true, pullRequests: true, issues: true } },
} satisfies Prisma.RepositoryInclude;

export type RepositoryWithRelations = Prisma.RepositoryGetPayload<{
  include: typeof REPOSITORY_INCLUDE;
}>;

@Injectable()
export class RepositoriesRepository extends TenantRepository<Repository> {
  constructor(prisma: PrismaService) {
    super(prisma, 'Repository');
  }

  protected get delegate(): ModelDelegate {
    return this.prisma.repository as unknown as ModelDelegate;
  }

  findByExternalId(providerId: string, externalRepositoryId: string) {
    return this.prisma.repository.findUnique({
      where: {
        providerId_externalRepositoryId: { providerId, externalRepositoryId },
      },
    });
  }

  /** Resolves a webhook payload's repository without a tenant hint. */
  findByFullNameForProvider(providerId: string, fullName: string) {
    return this.prisma.repository.findFirst({
      where: { providerId, fullName },
    });
  }

  /** Latest quality snapshot per repository, used across dashboards and lists. */
  async latestSnapshots(organizationId: string, repositoryIds: string[]) {
    if (repositoryIds.length === 0)
      return new Map<
        string,
        Awaited<ReturnType<typeof this.prisma.codeQualitySnapshot.findFirst>>
      >();

    const snapshots = await this.prisma.codeQualitySnapshot.findMany({
      where: { organizationId, repositoryId: { in: repositoryIds } },
      orderBy: { snapshotDate: 'desc' },
    });

    const latest = new Map<string, (typeof snapshots)[number]>();
    for (const snapshot of snapshots) {
      if (!latest.has(snapshot.repositoryId))
        latest.set(snapshot.repositoryId, snapshot);
    }
    return latest;
  }
}
