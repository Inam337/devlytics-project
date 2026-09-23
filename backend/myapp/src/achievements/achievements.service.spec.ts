import type { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import type { PrismaService } from '../database/prisma.service';
import { NotificationEvent } from '../notifications/notification-events';
import type { NotificationsService } from '../notifications/notifications.service';
import type { MailService } from '../common/services/mail.service';
import { AchievementsService } from './achievements.service';

describe('AchievementsService', () => {
  let prisma: {
    achievement: { findMany: jest.Mock };
    userAchievement: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
    developerDailyMetric: { aggregate: jest.Mock };
    developerScore: { findFirst: jest.Mock };
    repositoryMember: { findMany: jest.Mock };
    codeQualitySnapshot: { findMany: jest.Mock };
    improvementGoal: { count: jest.Mock };
    user: { findUnique: jest.Mock };
  };
  let notifications: { notify: jest.Mock };
  let mail: { sendTemplate: jest.Mock };
  let config: ConfigService;
  let service: AchievementsService;

  beforeEach(() => {
    prisma = {
      achievement: { findMany: jest.fn() },
      userAchievement: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      developerDailyMetric: { aggregate: jest.fn() },
      developerScore: { findFirst: jest.fn() },
      repositoryMember: { findMany: jest.fn() },
      codeQualitySnapshot: { findMany: jest.fn() },
      improvementGoal: { count: jest.fn() },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          email: 'ada@example.com',
          firstName: 'Ada',
        }),
      },
    };
    notifications = { notify: jest.fn().mockResolvedValue(undefined) };
    mail = { sendTemplate: jest.fn().mockResolvedValue({ success: true }) };
    config = {
      get: jest.fn().mockReturnValue('http://localhost:3000'),
    } as unknown as ConfigService;

    service = new AchievementsService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
      mail as unknown as MailService,
      config,
    );
  });

  describe('findForUser', () => {
    it('defaults to LOCKED with zeroed progress for a catalog badge the user has no record for', async () => {
      prisma.achievement.findMany.mockResolvedValue([
        { id: 'ach-1', targetValue: new Prisma.Decimal(100) },
      ]);
      prisma.userAchievement.findMany.mockResolvedValue([]);

      const result = await service.findForUser('org-1', 'user-1');

      expect(result).toEqual([
        expect.objectContaining({
          status: 'LOCKED',
          currentValue: 0,
          targetValue: 100,
          progressPercent: 0,
          earnedAt: null,
        }),
      ]);
    });

    it('merges the earned record when one exists', async () => {
      prisma.achievement.findMany.mockResolvedValue([
        { id: 'ach-1', targetValue: new Prisma.Decimal(100) },
      ]);
      const earnedAt = new Date('2026-01-15');
      prisma.userAchievement.findMany.mockResolvedValue([
        {
          achievementId: 'ach-1',
          status: 'EARNED',
          currentValue: new Prisma.Decimal(100),
          progressPercent: new Prisma.Decimal(100),
          evidence: '100 of 100 completed',
          earnedAt,
        },
      ]);

      const result = await service.findForUser('org-1', 'user-1');

      expect(result[0]).toEqual(
        expect.objectContaining({
          status: 'EARNED',
          currentValue: 100,
          progressPercent: 100,
          earnedAt,
        }),
      );
    });
  });

  describe('evaluateForUser', () => {
    function commitsAchievement(target = 100) {
      return {
        id: 'ach-commits',
        name: 'Century',
        description: 'Author 100 commits',
        metricKey: 'commits',
        targetValue: new Prisma.Decimal(target),
      };
    }

    it('skips a catalog entry whose metricKey has no known measurer', async () => {
      prisma.achievement.findMany.mockResolvedValue([
        {
          id: 'ach-unknown',
          metricKey: 'not_a_real_metric',
          targetValue: new Prisma.Decimal(1),
        },
      ]);

      const earned = await service.evaluateForUser('org-1', 'user-1');

      expect(earned).toBe(0);
      expect(prisma.userAchievement.findUnique).not.toHaveBeenCalled();
      expect(prisma.userAchievement.upsert).not.toHaveBeenCalled();
    });

    it('marks IN_PROGRESS (not LOCKED) once the measured value is above zero but below target', async () => {
      prisma.achievement.findMany.mockResolvedValue([commitsAchievement(100)]);
      prisma.developerDailyMetric.aggregate.mockResolvedValue({
        _sum: { commits: 50 },
      });
      prisma.userAchievement.findUnique.mockResolvedValue(null);
      prisma.userAchievement.upsert.mockResolvedValue({
        evidence: '50 of 100 completed',
      });

      const earned = await service.evaluateForUser('org-1', 'user-1');

      expect(earned).toBe(0);
      expect(prisma.userAchievement.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ status: 'IN_PROGRESS' }),
        }),
      );
      expect(notifications.notify).not.toHaveBeenCalled();
    });

    it('newly earning a badge notifies once, sends the earned email, and counts toward the return value', async () => {
      prisma.achievement.findMany.mockResolvedValue([commitsAchievement(100)]);
      prisma.developerDailyMetric.aggregate.mockResolvedValue({
        _sum: { commits: 120 },
      });
      prisma.userAchievement.findUnique.mockResolvedValue(null); // not previously earned
      prisma.userAchievement.upsert.mockResolvedValue({
        evidence: '100 of 100 completed',
      });

      const earned = await service.evaluateForUser('org-1', 'user-1');

      expect(earned).toBe(1);
      expect(prisma.userAchievement.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ status: 'EARNED' }),
        }),
      );
      expect(notifications.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          userId: 'user-1',
          event: NotificationEvent.ACHIEVEMENT_EARNED,
        }),
      );
      expect(mail.sendTemplate).toHaveBeenCalledWith(
        'ada@example.com',
        expect.objectContaining({ subject: expect.any(String) }),
      );
    });

    it('does not re-notify or re-send mail for a badge that was already earned in a prior run', async () => {
      prisma.achievement.findMany.mockResolvedValue([commitsAchievement(100)]);
      prisma.developerDailyMetric.aggregate.mockResolvedValue({
        _sum: { commits: 150 },
      });
      prisma.userAchievement.findUnique.mockResolvedValue({
        status: 'EARNED',
        earnedAt: new Date('2026-01-01'),
      });
      prisma.userAchievement.upsert.mockResolvedValue({
        evidence: '100 of 100 completed',
      });

      const earned = await service.evaluateForUser('org-1', 'user-1');

      expect(earned).toBe(0);
      expect(notifications.notify).not.toHaveBeenCalled();
      expect(mail.sendTemplate).not.toHaveBeenCalled();
    });

    it('preserves the original earnedAt rather than resetting it on a re-evaluation', async () => {
      prisma.achievement.findMany.mockResolvedValue([commitsAchievement(100)]);
      prisma.developerDailyMetric.aggregate.mockResolvedValue({
        _sum: { commits: 150 },
      });
      const originalEarnedAt = new Date('2026-01-01');
      prisma.userAchievement.findUnique.mockResolvedValue({
        status: 'EARNED',
        earnedAt: originalEarnedAt,
      });
      prisma.userAchievement.upsert.mockResolvedValue({});

      await service.evaluateForUser('org-1', 'user-1');

      expect(prisma.userAchievement.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ earnedAt: originalEarnedAt }),
        }),
      );
    });

    it('a badge that failed to send its earned email still counts as earned, without throwing', async () => {
      prisma.achievement.findMany.mockResolvedValue([commitsAchievement(100)]);
      prisma.developerDailyMetric.aggregate.mockResolvedValue({
        _sum: { commits: 100 },
      });
      prisma.userAchievement.findUnique.mockResolvedValue(null);
      prisma.userAchievement.upsert.mockResolvedValue({
        evidence: '100 of 100 completed',
      });
      mail.sendTemplate.mockResolvedValue({
        success: false,
        error: 'SMTP down',
      });

      await expect(service.evaluateForUser('org-1', 'user-1')).resolves.toBe(1);
    });
  });
});
