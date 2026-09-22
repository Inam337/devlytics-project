import { createHmac } from 'node:crypto';
import type { Queue } from 'bullmq';
import type { CryptoService } from '../common/services/crypto.service';
import type { PrismaService } from '../database/prisma.service';
import { WebhooksService } from './webhooks.service';

describe('WebhooksService', () => {
  let prisma: { repository: { findMany: jest.Mock } };
  let crypto: { decrypt: jest.Mock; safeEqual: jest.Mock };
  let queue: { add: jest.Mock };
  let service: WebhooksService;

  const secret = 'shared-secret';
  const rawBody = Buffer.from(JSON.stringify({ ref: 'refs/heads/main' }));
  const validSignature = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;

  beforeEach(() => {
    prisma = {
      repository: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'repo-1',
            organizationId: 'org-1',
            fullName: 'devlytics-demo/customer-portal-web',
            provider: {
              id: 'provider-1',
              webhookSecretEncrypted: 'enc(secret)',
            },
          },
        ]),
      },
    };
    crypto = {
      decrypt: jest.fn().mockReturnValue(secret),
      safeEqual: jest.fn((a: string, b: string) => a === b),
    };
    queue = { add: jest.fn().mockResolvedValue({}) };

    service = new WebhooksService(
      prisma as unknown as PrismaService,
      crypto as unknown as CryptoService,
      queue as unknown as Queue,
    );
  });

  describe('handleGithub', () => {
    it('enqueues the event onto webhook-processing after a valid signature and returns immediately (no direct audit/sync work)', async () => {
      const result = await service.handleGithub(
        rawBody,
        validSignature,
        'push',
        'devlytics-demo/customer-portal-web',
      );

      expect(queue.add).toHaveBeenCalledWith(
        'process-event',
        {
          organizationId: 'org-1',
          repositoryId: 'repo-1',
          fullName: 'devlytics-demo/customer-portal-web',
          eventKey: 'github:push',
        },
        undefined,
      );
      expect(result).toEqual({
        received: true,
        repositoryId: 'repo-1',
        queued: true,
      });
    });

    it('rejects a request with no repository.full_name in the payload', async () => {
      await expect(
        service.handleGithub(rawBody, validSignature, 'push', undefined),
      ).rejects.toThrow();
      expect(queue.add).not.toHaveBeenCalled();
    });

    it('rejects a missing signature header', async () => {
      await expect(
        service.handleGithub(rawBody, undefined, 'push', 'org/repo'),
      ).rejects.toThrow();
      expect(queue.add).not.toHaveBeenCalled();
    });

    it('rejects an incorrect signature', async () => {
      await expect(
        service.handleGithub(
          rawBody,
          'sha256=wrong',
          'push',
          'devlytics-demo/customer-portal-web',
        ),
      ).rejects.toThrow();
      expect(queue.add).not.toHaveBeenCalled();
    });
  });

  describe('handleGitlab', () => {
    it('enqueues the event after a valid token match', async () => {
      const result = await service.handleGitlab(
        secret,
        'Push Hook',
        'devlytics-demo/customer-portal-web',
      );

      expect(queue.add).toHaveBeenCalledWith(
        'process-event',
        expect.objectContaining({ eventKey: 'gitlab:Push Hook' }),
        undefined,
      );
      expect(result.queued).toBe(true);
    });

    it('rejects a missing token header', async () => {
      await expect(
        service.handleGitlab(undefined, 'Push Hook', 'org/repo'),
      ).rejects.toThrow();
      expect(queue.add).not.toHaveBeenCalled();
    });
  });
});
