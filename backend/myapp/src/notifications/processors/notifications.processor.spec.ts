import type { Job } from 'bullmq';
import type { NotificationsService } from '../notifications.service';
import { NotificationsProcessor } from './notifications.processor';

describe('NotificationsProcessor', () => {
  let notifications: { persist: jest.Mock };
  let processor: NotificationsProcessor;

  beforeEach(() => {
    notifications = { persist: jest.fn() };
    processor = new NotificationsProcessor(
      notifications as unknown as NotificationsService,
    );
  });

  function job(data: Record<string, unknown>): Job {
    return { data } as unknown as Job;
  }

  it('persists the batch of notifications carried by the job', async () => {
    const inputs = [{ organizationId: 'org-1', userId: 'user-1' }];

    await processor.process(job({ organizationId: 'org-1', inputs }));

    expect(notifications.persist).toHaveBeenCalledWith(inputs);
  });
});
