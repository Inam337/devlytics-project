import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GitProviderType, Prisma, ProviderStatus } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { AppException } from '../../common/exceptions/app.exception';
import { CryptoService } from '../../common/services/crypto.service';
import { PrismaService } from '../../database/prisma.service';
import type { ActorContext } from '../../organizations/organizations.service';
import { ProviderRequestError } from './git-provider.adapter';
import { ConnectProviderDto } from './dto/git-provider.dto';
import { ProviderAdapterFactory } from './provider-adapter.factory';

/**
 * Connection lifecycle for GitHub and GitLab.
 *
 * Tokens are verified against the provider before being stored, and stored
 * encrypted. Nothing is collected here — that is the sync module's job.
 */
@Injectable()
export class GitProvidersService {
  private readonly logger = new Logger(GitProvidersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapters: ProviderAdapterFactory,
    private readonly crypto: CryptoService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async findAll(organizationId: string) {
    const providers = await this.prisma.gitProvider.findMany({
      where: { organizationId },
      include: { _count: { select: { repositories: true, accounts: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return providers.map((provider) => ({
      id: provider.id,
      providerType: provider.providerType,
      displayName: provider.displayName,
      baseUrl: provider.baseUrl,
      externalAccountName: provider.externalAccountName,
      scopes: provider.scopes,
      status: provider.status,
      lastSyncAt: provider.lastSyncAt,
      lastErrorMessage: provider.lastErrorMessage,
      repositoryCount: provider._count.repositories,
      identityCount: provider._count.accounts,
      // Credentials are never returned, only whether one is present.
      hasStoredToken: Boolean(provider.accessTokenEncrypted),
      hasWebhookSecret: Boolean(provider.webhookSecretEncrypted),
    }));
  }

  async findOneOrFail(organizationId: string, id: string) {
    const provider = await this.prisma.gitProvider.findFirst({
      where: { id, organizationId },
    });
    if (!provider) throw AppException.notFound('Git provider', id);
    return provider;
  }

  /** Verifies the token, then stores the connection encrypted. */
  async connect(
    organizationId: string,
    providerType: GitProviderType,
    dto: ConnectProviderDto,
    actor: ActorContext,
  ) {
    const baseUrl = dto.baseUrl ?? this.adapters.defaultBaseUrl(providerType);
    const adapter = this.adapters.createForToken(
      providerType,
      dto.accessToken,
      baseUrl,
    );

    let account;
    try {
      account = await adapter.getCurrentUser();
    } catch (error) {
      const providerError = error as ProviderRequestError;
      throw AppException.unprocessable(
        `Could not authenticate with ${providerType}: ${providerError.message}`,
      );
    }

    const scopes = this.configuredScopes(providerType);

    const provider = await this.prisma.gitProvider.upsert({
      where: {
        organizationId_providerType_externalAccountId: {
          organizationId,
          providerType,
          externalAccountId: account.externalId,
        },
      },
      update: {
        accessTokenEncrypted: this.crypto.encrypt(dto.accessToken),
        refreshTokenEncrypted: this.crypto.encrypt(dto.refreshToken),
        webhookSecretEncrypted: this.crypto.encrypt(
          dto.webhookSecret ?? this.configuredWebhookSecret(providerType),
        ),
        baseUrl,
        externalAccountName: dto.externalAccountName ?? account.username,
        status: ProviderStatus.CONNECTED,
        lastErrorMessage: null,
        scopes,
      },
      create: {
        organizationId,
        providerType,
        displayName: `${providerType === 'GITHUB' ? 'GitHub' : 'GitLab'} — ${account.username}`,
        baseUrl,
        externalAccountId: account.externalId,
        externalAccountName: dto.externalAccountName ?? account.username,
        accessTokenEncrypted: this.crypto.encrypt(dto.accessToken),
        refreshTokenEncrypted: this.crypto.encrypt(dto.refreshToken),
        webhookSecretEncrypted: this.crypto.encrypt(
          dto.webhookSecret ?? this.configuredWebhookSecret(providerType),
        ),
        scopes,
        status: ProviderStatus.CONNECTED,
        connectedById: actor.actorId,
      },
    });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'INTEGRATION',
      action: 'integration.connected',
      summary: `${providerType} connected as ${account.username}`,
      entityType: 'GitProvider',
      entityId: provider.id,
      after: { providerType, account: account.username, scopes },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return {
      id: provider.id,
      providerType: provider.providerType,
      displayName: provider.displayName,
      externalAccountName: provider.externalAccountName,
      scopes: provider.scopes,
      status: provider.status,
    };
  }

  /** Repositories visible to the connection, flagged with what is already imported. */
  async discoverRepositories(organizationId: string, providerId: string) {
    const provider = await this.findOneOrFail(organizationId, providerId);
    const adapter = this.adapters.create(provider);

    let discovered;
    try {
      discovered = await adapter.getRepositories();
    } catch (error) {
      await this.recordFailure(provider.id, error as ProviderRequestError);
      throw AppException.unprocessable(
        `Could not list repositories: ${(error as Error).message}`,
      );
    }

    const imported = await this.prisma.repository.findMany({
      where: { organizationId, providerId },
      select: { externalRepositoryId: true },
    });
    const importedIds = new Set(
      imported.map((repo) => repo.externalRepositoryId),
    );

    return discovered.map((repository) => ({
      ...repository,
      alreadyImported: importedIds.has(repository.externalId),
    }));
  }

  async disconnect(organizationId: string, id: string, actor: ActorContext) {
    const provider = await this.findOneOrFail(organizationId, id);

    // Repositories and their measured history survive; only the connection goes.
    await this.prisma.$transaction([
      this.prisma.repository.updateMany({
        where: { organizationId, providerId: id },
        data: { syncStatus: 'DISCONNECTED' },
      }),
      this.prisma.gitProvider.update({
        where: { id },
        data: {
          status: ProviderStatus.DISCONNECTED,
          accessTokenEncrypted: null,
          refreshTokenEncrypted: null,
        },
      }),
    ]);

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'INTEGRATION',
      action: 'integration.disconnected',
      summary: `${provider.providerType} connection '${provider.displayName}' disconnected`,
      entityType: 'GitProvider',
      entityId: id,
      before: { status: provider.status },
      after: { status: ProviderStatus.DISCONNECTED },
      reason: actor.reason,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return { id, status: ProviderStatus.DISCONNECTED };
  }

  /**
   * Records a provider failure and freezes collection. Last-known metrics stay
   * exactly where they are — nothing is zeroed (docs/devlytics.md §4.2).
   */
  async recordFailure(
    providerId: string,
    error: ProviderRequestError,
  ): Promise<ProviderStatus> {
    const status: ProviderStatus = error.tokenExpired
      ? ProviderStatus.TOKEN_EXPIRED
      : error.rateLimited
        ? ProviderStatus.RATE_LIMITED
        : ProviderStatus.CONNECTED;

    await this.prisma.gitProvider.update({
      where: { id: providerId },
      data: { status, lastErrorMessage: error.message.slice(0, 1000) },
    });

    this.logger.warn(
      `Provider ${providerId} marked ${status}: ${error.message}`,
    );
    return status;
  }

  async markSynced(providerId: string): Promise<void> {
    await this.prisma.gitProvider.update({
      where: { id: providerId },
      data: {
        status: ProviderStatus.CONNECTED,
        lastSyncAt: new Date(),
        lastErrorMessage: null,
      },
    });
  }

  /** Decrypted webhook secret for signature validation. */
  webhookSecret(provider: {
    webhookSecretEncrypted: string | null;
  }): string | null {
    return this.crypto.decrypt(provider.webhookSecretEncrypted);
  }

  private configuredScopes(providerType: GitProviderType): string[] {
    return providerType === 'GITHUB'
      ? this.config.get<string[]>('git.github.scopes', [])
      : this.config.get<string[]>('git.gitlab.scopes', []);
  }

  private configuredWebhookSecret(providerType: GitProviderType): string {
    return providerType === 'GITHUB'
      ? this.config.get<string>('git.github.webhookSecret', '')
      : this.config.get<string>('git.gitlab.webhookSecret', '');
  }

  /** Providers eligible for the reconciliation poll. */
  findSyncable(
    organizationId?: string,
  ): Promise<Prisma.GitProviderGetPayload<object>[]> {
    return this.prisma.gitProvider.findMany({
      where: {
        status: { in: [ProviderStatus.CONNECTED, ProviderStatus.RATE_LIMITED] },
        ...(organizationId ? { organizationId } : {}),
      },
    });
  }
}
