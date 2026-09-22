import type { Job } from 'bullmq';
import type { AuditService } from '../../audit/audit.service';
import type { SyncService } from '../../sync/sync.service';
import { WebhookProcessingProcessor } from './webhook-processing.processor';

describe('WebhookProcessingProcessor', () => {
  let sync: { queueIncremental: jest.Mock };
  let audit: { record: jest.Mock };
  let processor: WebhookProcessingProcessor;

  beforeEach(() => {
    sync = { queueIncremental: jest.fn().mockResolvedValue([{ id: 'job-1' }]) };
    audit = { record: jest.fn() };
    processor = new WebhookProcessingProcessor(
      sync as unknown as SyncService,
      audit as unknown as AuditService,
    );
  });

  function job(data: Record<string, unknown>): Job {
    return { data } as unknown as Job;
  }

  it('queues an incremental sync for the repository and audits the event', async () => {
    await processor.process(
      job({
        organizationId: 'org-1',
        repositoryId: 'repo-1',
        fullName: 'org/repo',
        eventKey: 'github:push',
      }),
    );

    expect(sync.queueIncremental).toHaveBeenCalledWith('org-1', ['repo-1']);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        category: 'INTEGRATION',
        action: 'webhook.received',
        entityId: 'repo-1',
      }),
    );
  });
});
