import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { createHmac } from 'node:crypto';
import { AppException } from '../common/exceptions/app.exception';
import { CryptoService } from '../common/services/crypto.service';
import { PrismaService } from '../database/prisma.service';
import { QUEUE } from '../queue/queue.constants';
import { safeEnqueue } from '../queue/queue.util';

interface WebhookMatch {
  organizationId: string;
  repositoryId: string;
  fullName: string;
}

/**
 * Stage 6 (Stay current) inbound side: validates the provider's signature and
 * resolves which repository the event belongs to (both fast, DB-read-bound —
 * stays synchronous so the response comes back well within the provider's
 * delivery timeout). Everything after verification (audit + queuing the
 * incremental sync) moves onto the `webhook-processing` queue
 * (`WebhookProcessingProcessor`), per requirements §12. Webhook bodies are a
 * trigger, not a data source — the actual data is re-fetched through the same
 * provider adapter used everywhere else, so there is exactly one code path
 * that writes commits/PRs/etc.
 */
@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    @InjectQueue(QUEUE.WEBHOOK_PROCESSING)
    private readonly webhookQueue: Queue,
  ) {}

  async handleGithub(
    rawBody: Buffer,
    signatureHeader: string | undefined,
    event: string,
    fullName: string | undefined,
  ) {
    if (!fullName)
      throw AppException.badRequest('Payload is missing repository.full_name');
    if (!signatureHeader?.startsWith('sha256=')) {
      throw AppException.unauthorized('Missing X-Hub-Signature-256 header');
    }

    const match = await this.resolveAndVerify('GITHUB', fullName, (secret) => {
      const digest = createHmac('sha256', secret).update(rawBody).digest('hex');
      return this.crypto.safeEqual(`sha256=${digest}`, signatureHeader);
    });

    return this.acceptEvent(match, `github:${event}`);
  }

  async handleGitlab(
    tokenHeader: string | undefined,
    event: string,
    fullName: string | undefined,
  ) {
    if (!fullName)
      throw AppException.badRequest(
        'Payload is missing project.path_with_namespace',
      );
    if (!tokenHeader)
      throw AppException.unauthorized('Missing X-Gitlab-Token header');

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
      include: {
        provider: { select: { id: true, webhookSecretEncrypted: true } },
      },
    });

    for (const candidate of candidates) {
      const secret = this.crypto.decrypt(
        candidate.provider.webhookSecretEncrypted,
      );
      if (secret && verify(secret)) {
        return {
          organizationId: candidate.organizationId,
          repositoryId: candidate.id,
          fullName: candidate.fullName,
        };
      }
    }

    this.logger.warn(
      `Webhook signature validation failed for ${providerType} repository ${fullName}`,
    );
    throw AppException.unauthorized('Webhook signature validation failed');
  }

  private async acceptEvent(match: WebhookMatch, eventKey: string) {
    const queued = await safeEnqueue(
      this.webhookQueue,
      'process-event',
      {
        organizationId: match.organizationId,
        repositoryId: match.repositoryId,
        fullName: match.fullName,
        eventKey,
      },
      this.logger,
    );

    return { received: true, repositoryId: match.repositoryId, queued };
  }
}
