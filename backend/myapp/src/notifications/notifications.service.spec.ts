import type { Queue } from 'bullmq';
import type { PrismaService } from '../database/prisma.service';
import { NotificationsService } from './notifications.service';
import { NotificationEvent } from './notification-events';

describe('NotificationsService', () => {
  let prisma: { notification: { createMany: jest.Mock } };
  let queue: { add: jest.Mock };
  let service: NotificationsService;

  beforeEach(() => {
    prisma = { notification: { createMany: jest.fn().mockResolvedValue({}) } };
    queue = { add: jest.fn().mockResolvedValue({}) };
    service = new NotificationsService(
      prisma as unknown as PrismaService,
      queue as unknown as Queue,
    );
  });

  const input = {
    organizationId: 'org-1',
    userId: 'user-1',
    event: NotificationEvent.ACHIEVEMENT_EARNED,
    title: 'Nice work',
    body: 'You earned an achievement',
  };

  describe('notify / notifyMany', () => {
    it('enqueues a single notification instead of writing it inline', async () => {
      await service.notify(input);

      expect(queue.add).toHaveBeenCalledWith(
        'deliver',
        { organizationId: 'org-1', inputs: [input] },
        undefined,
      );
      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });

    it('enqueues a batch fan-out instead of writing it inline', async () => {
      const inputs = [input, { ...input, userId: 'user-2' }];
      await service.notifyMany(inputs);

      expect(queue.add).toHaveBeenCalledWith(
        'deliver',
        { organizationId: 'org-1', inputs },
        undefined,
      );
    });

    it('does nothing for an empty batch', async () => {
      await service.notifyMany([]);
      expect(queue.add).not.toHaveBeenCalled();
    });
  });

  describe('persist', () => {
    it('writes the notification rows with the category derived from the event', async () => {
      await service.persist([input]);

      expect(prisma.notification.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            organizationId: 'org-1',
            userId: 'user-1',
            eventKey: NotificationEvent.ACHIEVEMENT_EARNED,
            category: 'MILESTONE',
            channel: 'IN_APP',
          }),
        ],
      });
    });

    it('swallows a write failure rather than letting it propagate', async () => {
      prisma.notification.createMany.mockRejectedValue(new Error('db down'));
      await expect(service.persist([input])).resolves.toBeUndefined();
    });
  });
});
