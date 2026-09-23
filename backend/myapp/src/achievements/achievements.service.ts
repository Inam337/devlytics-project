import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AchievementStatus, Prisma } from '@prisma/client';
import { achievementEarnedMail } from '../common/mail-templates/digest-milestone-alert.templates';
import { MailService } from '../common/services/mail.service';
import { NumberUtil } from '../common/utils/number.util';
import { PrismaService } from '../database/prisma.service';
import { NotificationEvent } from '../notifications/notification-events';
import { NotificationsService } from '../notifications/notifications.service';

/** Maps an achievement's metric key to how it is measured for one developer. */
type Measurer = (
  prisma: PrismaService,
  organizationId: string,
  userId: string,
) => Promise<number>;

const MEASURERS: Record<string, Measurer> = {
  commits: async (prisma, organizationId, userId) => {
    const result = await prisma.developerDailyMetric.aggregate({
      where: { organizationId, userId },
      _sum: { commits: true },
    });
    return result._sum.commits ?? 0;
  },
  prs_merged: async (prisma, organizationId, userId) => {
    const result = await prisma.developerDailyMetric.aggregate({
      where: { organizationId, userId },
      _sum: { prsMerged: true },
    });
    return result._sum.prsMerged ?? 0;
  },
  reviews_given: async (prisma, organizationId, userId) => {
    const result = await prisma.developerDailyMetric.aggregate({
      where: { organizationId, userId },
      _sum: { reviewsGiven: true },
    });
    return result._sum.reviewsGiven ?? 0;
  },
  issues_resolved: async (prisma, organizationId, userId) => {
    const result = await prisma.developerDailyMetric.aggregate({
      where: { organizationId, userId },
      _sum: { issuesResolved: true },
    });
    return result._sum.issuesResolved ?? 0;
  },
  tests_added: async (prisma, organizationId, userId) => {
    const result = await prisma.developerDailyMetric.aggregate({
      where: { organizationId, userId },
      _sum: { testsAdded: true },
    });
    return result._sum.testsAdded ?? 0;
  },
  docs_changed: async (prisma, organizationId, userId) => {
    const result = await prisma.developerDailyMetric.aggregate({
      where: { organizationId, userId },
      _sum: { docsChanged: true },
    });
    return result._sum.docsChanged ?? 0;
  },
  quality_score: async (prisma, organizationId, userId) => {
    const latest = await prisma.developerScore.findFirst({
      where: { organizationId, userId },
      orderBy: { computedAt: 'desc' },
    });
    return latest ? NumberUtil.toNumber(latest.codeQualityScore) : 0;
  },
  coverage_percent: async (prisma, organizationId, userId) => {
    const repoIds = await prisma.repositoryMember.findMany({
      where: { organizationId, userId },
      select: { repositoryId: true },
    });
    if (repoIds.length === 0) return 0;
    const snapshots = await prisma.codeQualitySnapshot.findMany({
      where: {
        organizationId,
        repositoryId: { in: repoIds.map((r) => r.repositoryId) },
      },
      orderBy: { snapshotDate: 'desc' },
    });
    const best = Math.max(
      0,
      ...snapshots.map((s) => NumberUtil.toNumber(s.coveragePercent)),
    );
    return best;
  },
  goals_completed: async (prisma, organizationId, userId) => {
    return prisma.improvementGoal.count({
      where: { organizationId, ownerUserId: userId, status: 'COMPLETED' },
    });
  },
};

/**
 * Achievement evaluation (docs/devlytics.md §6 Achievements). Every badge
 * carries the measured evidence behind it — never a manually flipped flag.
 */
@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async findForUser(organizationId: string, userId: string) {
    const catalog = await this.prisma.achievement.findMany({
      orderBy: { category: 'asc' },
    });
    const existing = await this.prisma.userAchievement.findMany({
      where: { organizationId, userId },
    });
    const byAchievement = new Map(
      existing.map((row) => [row.achievementId, row]),
    );

    return catalog.map((achievement) => {
      const record = byAchievement.get(achievement.id);
      return {
        achievement,
        status: record?.status ?? 'LOCKED',
        currentValue: record ? NumberUtil.toNumber(record.currentValue) : 0,
        targetValue: NumberUtil.toNumber(achievement.targetValue),
        progressPercent: record
          ? NumberUtil.toNumber(record.progressPercent)
          : 0,
        evidence: record?.evidence ?? null,
        earnedAt: record?.earnedAt ?? null,
      };
    });
  }

  /** Re-evaluates every badge for one developer; called after scores/goals change. */
  async evaluateForUser(
    organizationId: string,
    userId: string,
  ): Promise<number> {
    const catalog = await this.prisma.achievement.findMany();
    let earned = 0;

    for (const achievement of catalog) {
      const measurer = MEASURERS[achievement.metricKey];
      if (!measurer) continue;

      const currentValue = await measurer(this.prisma, organizationId, userId);
      const target = NumberUtil.toNumber(achievement.targetValue);
      const progressPercent = NumberUtil.normalize(currentValue, target || 1);
      const isEarned = currentValue >= target;

      const existing = await this.prisma.userAchievement.findUnique({
        where: {
          userId_achievementId: { userId, achievementId: achievement.id },
        },
      });
      const wasEarned = existing?.status === 'EARNED';

      const record = await this.prisma.userAchievement.upsert({
        where: {
          userId_achievementId: { userId, achievementId: achievement.id },
        },
        update: {
          currentValue: new Prisma.Decimal(currentValue),
          progressPercent: new Prisma.Decimal(progressPercent),
          status: isEarned
            ? 'EARNED'
            : currentValue > 0
              ? 'IN_PROGRESS'
              : 'LOCKED',
          evidence: describeEvidence(
            achievement.metricKey,
            currentValue,
            target,
          ),
          earnedAt: isEarned ? (existing?.earnedAt ?? new Date()) : null,
        },
        create: {
          organizationId,
          userId,
          achievementId: achievement.id,
          currentValue: new Prisma.Decimal(currentValue),
          targetValue: achievement.targetValue,
          progressPercent: new Prisma.Decimal(progressPercent),
          status: isEarned
            ? AchievementStatus.EARNED
            : currentValue > 0
              ? AchievementStatus.IN_PROGRESS
              : AchievementStatus.LOCKED,
          evidence: describeEvidence(
            achievement.metricKey,
            currentValue,
            target,
          ),
          earnedAt: isEarned ? new Date() : null,
        },
      });

      if (isEarned && !wasEarned) {
        earned += 1;
        await this.notifications.notify({
          organizationId,
          userId,
          event: NotificationEvent.ACHIEVEMENT_EARNED,
          title: `Achievement earned: ${achievement.name}`,
          body: record.evidence ?? achievement.description,
          actionUrl: '/achievements',
        });
        await this.sendAchievementEarnedMail(
          organizationId,
          userId,
          achievement.name,
          achievement.description,
          record.evidence ?? undefined,
        );
      }
    }

    return earned;
  }

  private async sendAchievementEarnedMail(
    organizationId: string,
    userId: string,
    achievementName: string,
    achievementDescription: string,
    evidence?: string,
  ): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true },
      });
      if (!user) return;
      const result = await this.mail.sendTemplate(
        user.email,
        achievementEarnedMail({
          recipientFirstName: user.firstName,
          achievementName,
          achievementDescription,
          evidence,
          ctaUrl: `${this.appUrl()}/achievements`,
        }),
      );
      if (!result.success) {
        this.logger.warn(
          `Achievement-earned email failed for user ${userId} (org ${organizationId}): ${result.error}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Unexpected error sending achievement-earned email to user ${userId}: ${(error as Error).message}`,
      );
    }
  }

  private appUrl(): string {
    return this.config.get<string>('app.url', 'http://localhost:3000');
  }
}

function describeEvidence(
  metricKey: string,
  current: number,
  target: number,
): string {
  switch (metricKey) {
    case 'quality_score':
    case 'coverage_percent':
      return `${current} of ${target} required`;
    default:
      return `${Math.min(current, target)} of ${target} completed`;
  }
}
