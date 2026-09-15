import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/exceptions/app.exception';
import { CryptoService } from '../common/services/crypto.service';
import { PrismaService } from '../database/prisma.service';
import { SyncService } from '../sync/sync.service';

interface WebhookMatch {
  organizationId: string;
  repositoryId: string;
  fullName: string;
}

/**
 * Stage 6 (Stay current) inbound side: validates the provider's signature,
 * resolves which repository the event belongs to, and queues a fast
 * incremental sync. Webhook bodies are a trigger, not a data source — the
 * actual data is re-fetched through the same provider adapter used everywhere
 * else, so there is exactly one code path that writes commits/PRs/etc.
 */
@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly sync: SyncService,
    private readonly audit: AuditService,
  ) {}

  async handleGithub(rawBody: Buffer, signatureHeader: string | undefined, event: string, fullName: string | undefined) {
    if (!fullName) throw AppException.badRequest('Payload is missing repository.full_name');
    if (!signatureHeader?.startsWith('sha256=')) {
      throw AppException.unauthorized('Missing X-Hub-Signature-256 header');
    }

    const match = await this.resolveAndVerify('GITHUB', fullName, (secret) => {
      const digest = createHmac('sha256', secret).update(rawBody).digest('hex');
      return this.crypto.safeEqual(`sha256=${digest}`, signatureHeader);
    });

    return this.acceptEvent(match, `github:${event}`);
  }

  async handleGitlab(tokenHeader: string | undefined, event: string, fullName: string | undefined) {
    if (!fullName) throw AppException.badRequest('Payload is missing project.path_with_namespace');
    if (!tokenHeader) throw AppException.unauthorized('Missing X-Gitlab-Token header');

    const match = await this.resolveAndVerify('GITLAB', fullName, (secret) =>
      this.crypto.safeEqual(tokenHeader, secret),
    );

    return this.acceptEvent(match, `gitlab:${event}`);
  }

  private async resolveAndVerify(
    providerType: 'GITHUB' | 'GITLAB',
    fullName: string,
    verify: (secret: string) => boolean,
  ): Promise<WebhookMatch> {
    const candidates = await this.prisma.repository.findMany({
      where: { fullName, provider: { providerType } },
      include: { provider: { select: { id: true, webhookSecretEncrypted: true } } },
    });

    for (const candidate of candidates) {
      const secret = this.crypto.decrypt(candidate.provider.webhookSecretEncrypted);
      if (secret && verify(secret)) {
        return {
          organizationId: candidate.organizationId,
          repositoryId: candidate.id,
          fullName: candidate.fullName,
        };
      }
    }

    this.logger.warn(`Webhook signature validation failed for ${providerType} repository ${fullName}`);
    throw AppException.unauthorized('Webhook signature validation failed');
  }

  private async acceptEvent(match: WebhookMatch, eventKey: string) {
    const jobs = await this.sync.queueIncremental(match.organizationId, [match.repositoryId]);

    await this.audit.record({
      organizationId: match.organizationId,
      category: 'INTEGRATION',
      action: 'webhook.received',
      summary: `Webhook '${eventKey}' received for ${match.fullName}`,
      entityType: 'Repository',
      entityId: match.repositoryId,
    });

    return { received: true, repositoryId: match.repositoryId, queued: jobs.length > 0 };
  }
}
