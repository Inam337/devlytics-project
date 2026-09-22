import type { Job } from 'bullmq';
import type { MailService } from '../../common/services/mail.service';
import type { PrismaService } from '../../database/prisma.service';
import type { NotificationsService } from '../notifications.service';
import { NotificationsProcessor } from './notifications.processor';

describe('NotificationsProcessor', () => {
  let notifications: { persist: jest.Mock };
  let prisma: { user: { findUnique: jest.Mock } };
  let mail: { render: jest.Mock; send: jest.Mock };
  let processor: NotificationsProcessor;

  beforeEach(() => {
    notifications = { persist: jest.fn() };
    prisma = { user: { findUnique: jest.fn() } };
    mail = {
      render: jest.fn().mockReturnValue({
        subject: 'rendered-subject',
        html: '<p>rendered</p>',
        text: 'rendered',
      }),
      send: jest.fn().mockResolvedValue({ success: true }),
    };
    processor = new NotificationsProcessor(
      notifications as unknown as NotificationsService,
      prisma as unknown as PrismaService,
      mail as unknown as MailService,
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

  it('does not attempt to email IN_APP-channel inputs', async () => {
    const inputs = [
      { organizationId: 'org-1', userId: 'user-1', channel: 'IN_APP' },
    ];

    await processor.process(job({ organizationId: 'org-1', inputs }));

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('emails EMAIL-channel inputs using the recipient email and rendered content', async () => {
    prisma.user.findUnique.mockResolvedValue({ email: 'dev@example.com' });
    const inputs = [
      {
        organizationId: 'org-1',
        userId: 'user-1',
        event: 'goal_completed',
        title: 'Goal completed',
        body: 'You hit your goal.',
        actionUrl: 'https://app.devlytics.local/goals/1',
        channel: 'EMAIL',
      },
    ];

    await processor.process(job({ organizationId: 'org-1', inputs }));

    expect(mail.render).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Goal completed',
        bodyParagraphs: ['You hit your goal.'],
        cta: {
          label: 'View in Devlytics',
          url: 'https://app.devlytics.local/goals/1',
        },
      }),
    );
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'dev@example.com',
        subject: 'rendered-subject',
      }),
    );
  });

  it('skips EMAIL-channel inputs when the user has no email on record', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const inputs = [
      {
        organizationId: 'org-1',
        userId: 'user-1',
        title: 'x',
        body: 'y',
        channel: 'EMAIL',
      },
    ];

    await processor.process(job({ organizationId: 'org-1', inputs }));

    expect(mail.send).not.toHaveBeenCalled();
  });

  it('does not throw when the recipient lookup fails', async () => {
    prisma.user.findUnique.mockRejectedValue(new Error('db unavailable'));
    const inputs = [
      {
        organizationId: 'org-1',
        userId: 'user-1',
        title: 'x',
        body: 'y',
        channel: 'EMAIL',
      },
    ];

    await expect(
      processor.process(job({ organizationId: 'org-1', inputs })),
    ).resolves.toBeUndefined();
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('does not throw when sending the email fails', async () => {
    prisma.user.findUnique.mockResolvedValue({ email: 'dev@example.com' });
    mail.send.mockResolvedValue({ success: false, error: 'boom' });
    const inputs = [
      {
        organizationId: 'org-1',
        userId: 'user-1',
        title: 'x',
        body: 'y',
        channel: 'EMAIL',
      },
    ];

    await expect(
      processor.process(job({ organizationId: 'org-1', inputs })),
    ).resolves.toBeUndefined();
  });
});
