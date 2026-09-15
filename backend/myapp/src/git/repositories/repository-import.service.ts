import { Injectable, Logger } from '@nestjs/common';
import { AuditService } from '../../audit/audit.service';
import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../database/prisma.service';
import type { ActorContext } from '../../organizations/organizations.service';
import { SyncService } from '../../sync/sync.service';
import { ImportRepositoriesDto } from '../providers/dto/git-provider.dto';
import { GitProvidersService } from '../providers/git-providers.service';
import { ProviderAdapterFactory } from '../providers/provider-adapter.factory';

/**
 * Sync pipeline stage 1→2 handover: turns provider-side repositories into
 * `tbl_repository` rows and queues the history backfill. Import is idempotent —
 * re-importing an existing repository updates it instead of duplicating it.
 */
@Injectable()
export class RepositoryImportService {
  private readonly logger = new Logger(RepositoryImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: GitProvidersService,
    private readonly adapters: ProviderAdapterFactory,
    private readonly sync: SyncService,
    private readonly audit: AuditService,
  ) {}

  async importRepositories(
    organizationId: string,
    providerId: string,
    dto: ImportRepositoriesDto,
    actor: ActorContext,
  ) {
    const provider = await this.providers.findOneOrFail(organizationId, providerId);
    if (provider.status === 'DISCONNECTED') {
      throw AppException.unprocessable('Reconnect this provider before importing repositories');
    }

    const adapter = this.adapters.create(provider);
    const imported: { id: string; fullName: string }[] = [];

    for (const entry of dto.repositories) {
      const details = await adapter
        .getRepository({ fullName: entry.fullName, externalId: entry.externalRepositoryId })
        .catch((error: Error) => {
          this.logger.warn(`Could not read ${entry.fullName}: ${error.message}`);
          return null;
        });

      if (!details) {
        throw AppException.unprocessable(
          `Repository '${entry.fullName}' could not be read from the provider`,
        );
      }

      const repository = await this.prisma.repository.upsert({
        where: {
          providerId_externalRepositoryId: {
            providerId,
            externalRepositoryId: details.externalId,
          },
        },
        update: {
          name: details.name,
          fullName: details.fullName,
          description: details.description,
          url: details.url,
          cloneUrl: details.cloneUrl,
          defaultBranch: details.defaultBranch,
          language: details.language,
          visibility: details.visibility,
          isArchived: details.isArchived,
          projectId: entry.projectId,
          teamId: entry.teamId,
        },
        create: {
          organizationId,
          providerId,
          externalRepositoryId: details.externalId,
          name: details.name,
          fullName: details.fullName,
          description: details.description,
          url: details.url,
          cloneUrl: details.cloneUrl,
          defaultBranch: details.defaultBranch,
          language: details.language,
          visibility: details.visibility,
          isArchived: details.isArchived,
          projectId: entry.projectId,
          teamId: entry.teamId,
          syncStatus: 'NEVER_SYNCED',
        },
      });

      imported.push({ id: repository.id, fullName: repository.fullName });
    }

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'REPOSITORY',
      action: 'repository.imported',
      summary: `${imported.length} repository/repositories imported from ${provider.providerType}`,
      entityType: 'GitProvider',
      entityId: providerId,
      after: { repositories: imported.map((repo) => repo.fullName) },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    // Scores stay withheld until every selected repository finishes its backfill.
    const jobs =
      dto.startSync === false
        ? []
        : await this.sync.queueFullImport(
            organizationId,
            imported.map((repo) => repo.id),
            actor.actorId,
          );

    return {
      imported: imported.length,
      repositories: imported,
      syncJobs: jobs,
      note:
        jobs.length > 0
          ? 'History backfill queued. Scores are withheld until every selected repository completes.'
          : 'Repositories imported without starting collection.',
    };
  }
}
