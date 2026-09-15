import { Injectable } from '@nestjs/common';
import { NumberUtil } from '../common/utils/number.util';
import { PeriodUtil } from '../common/utils/period.util';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../database/prisma.service';

/**
 * Read-only aggregation for the Dashboard and detail-page dashboards.
 * Every number here is read from already-persisted tables — nothing is
 * computed live from raw activity, so the dashboard always agrees with the
 * dedicated metrics/quality/scoring/ranking endpoints.
 */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(organizationId: string) {
    const [developers, teams, projects, repositories, commitAgg, prAgg, reviewAgg, qualityAvg] =
      await Promise.all([
        this.prisma.organizationUser.count({ where: { organizationId, status: 'ACTIVE' } }),
        this.prisma.team.count({ where: { organizationId, status: 'ACTIVE' } }),
        this.prisma.project.count({ where: { organizationId } }),
        this.prisma.repository.count({ where: { organizationId, isArchived: false } }),
        this.prisma.commit.aggregate({
          where: { organizationId, isBot: false },
          _count: { _all: true },
          _sum: { additions: true, deletions: true },
        }),
        this.prisma.pullRequest.count({ where: { organizationId } }),
        this.prisma.pullRequestReview.count({ where: { organizationId } }),
        this.prisma.codeQualitySnapshot.aggregate({
          where: { organizationId },
          _avg: { qualityScore: true },
        }),
      ]);

    const [podium, topTeams, activity, qualitySummary, rankingTrend, aiSummary] = await Promise.all([
      this.developerPodium(organizationId),
      this.topTeams(organizationId),
      this.recentActivity(organizationId),
      this.qualitySummary(organizationId),
      this.rankingTrend(organizationId),
      this.aiSummary(organizationId),
    ]);

    return {
      kpis: {
        developers,
        teams,
        projects,
        repositories,
        commits: commitAgg._count._all,
        pullRequests: prAgg,
        reviews: reviewAgg,
        // Activity metric only — never part of a score.
        linesOfCode: (commitAgg._sum.additions ?? 0) + (commitAgg._sum.deletions ?? 0),
        qualityScore: NumberUtil.toNumber(qualityAvg._avg.qualityScore),
      },
      developerPodium: podium,
      topTeams,
      recentActivity: activity,
      qualitySummary,
      rankingTrend,
      aiAnalyticsSummary: aiSummary,
    };
  }

  async developerDashboard(organizationId: string, userId: string) {
    const membership = await this.prisma.organizationUser.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      include: { user: true },
    });
    if (!membership) throw AppException.notFound('Developer', userId);

    const [latestScore, rank, achievements, goals] = await Promise.all([
      this.prisma.developerScore.findFirst({
        where: { organizationId, userId },
        orderBy: { computedAt: 'desc' },
      }),
      this.prisma.rankingHistory.findFirst({
        where: { organizationId, subjectType: 'DEVELOPER', userId },
        orderBy: { periodStart: 'desc' },
      }),
      this.prisma.userAchievement.count({ where: { organizationId, userId, status: 'EARNED' } }),
      this.prisma.improvementGoal.findMany({
        where: { organizationId, ownerUserId: userId, status: { in: ['ACTIVE', 'AT_RISK'] } },
        take: 5,
      }),
    ]);

    return {
      user: {
        id: membership.user.id,
        firstName: membership.user.firstName,
        lastName: membership.user.lastName,
        avatarUrl: membership.user.avatarUrl,
      },
      score: latestScore
        ? {
            total: NumberUtil.toNumber(latestScore.totalScore),
            codeQuality: NumberUtil.toNumber(latestScore.codeQualityScore),
            delivery: NumberUtil.toNumber(latestScore.deliveryScore),
            codeReview: NumberUtil.toNumber(latestScore.codeReviewScore),
            testing: NumberUtil.toNumber(latestScore.testingScore),
            reliability: NumberUtil.toNumber(latestScore.reliabilityScore),
            freshness: latestScore.freshness,
          }
        : null,
      rank: rank?.rank ?? null,
      rankDelta: rank?.rankDelta ?? 0,
      achievementsEarned: achievements,
      activeGoals: goals,
    };
  }

  async teamDashboard(organizationId: string, teamId: string) {
    const team = await this.prisma.team.findFirst({ where: { id: teamId, organizationId } });
    if (!team) throw AppException.notFound('Team', teamId);

    const [score, rank, memberCount, repoCount] = await Promise.all([
      this.prisma.teamScore.findFirst({ where: { organizationId, teamId }, orderBy: { computedAt: 'desc' } }),
      this.prisma.rankingHistory.findFirst({
        where: { organizationId, subjectType: 'TEAM', teamId },
        orderBy: { periodStart: 'desc' },
      }),
      this.prisma.teamMember.count({ where: { organizationId, teamId } }),
      this.prisma.repository.count({ where: { organizationId, teamId } }),
    ]);

    return {
      team,
      score: score ? { total: NumberUtil.toNumber(score.totalScore), freshness: score.freshness } : null,
      rank: rank?.rank ?? null,
      rankDelta: rank?.rankDelta ?? 0,
      memberCount,
      repositoryCount: repoCount,
    };
  }

  async repositoryDashboard(organizationId: string, repositoryId: string) {
    const repository = await this.prisma.repository.findFirst({
      where: { id: repositoryId, organizationId },
    });
    if (!repository) throw AppException.notFound('Repository', repositoryId);

    const snapshot = await this.prisma.codeQualitySnapshot.findFirst({
      where: { organizationId, repositoryId },
      orderBy: { snapshotDate: 'desc' },
    });

    return {
      repository: {
        id: repository.id,
        name: repository.name,
        fullName: repository.fullName,
        syncStatus: repository.syncStatus,
        lastSyncAt: repository.lastSyncAt,
      },
      quality: snapshot
        ? {
            qualityScore: NumberUtil.toNumber(snapshot.qualityScore),
            coveragePercent: NumberUtil.toNumber(snapshot.coveragePercent),
            snapshotDate: snapshot.snapshotDate,
          }
        : null,
      isStale: ['FAILED', 'DISCONNECTED', 'PARTIAL'].includes(repository.syncStatus),
    };
  }

  private async developerPodium(organizationId: string, take = 5) {
    const scores = await this.prisma.developerScore.findMany({
      where: { organizationId, period: 'MONTHLY', periodStart: PeriodUtil.resolve('MONTHLY').start },
      orderBy: { totalScore: 'desc' },
      take,
      include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    });
    return scores.map((score) => ({
      user: score.user,
      totalScore: NumberUtil.toNumber(score.totalScore),
    }));
  }

  private async topTeams(organizationId: string, take = 5) {
    const scores = await this.prisma.teamScore.findMany({
      where: { organizationId, period: 'MONTHLY', periodStart: PeriodUtil.resolve('MONTHLY').start },
      orderBy: { totalScore: 'desc' },
      take,
      include: { team: { select: { id: true, name: true, code: true, teamColor: true } } },
    });
    return scores.map((score) => ({ team: score.team, totalScore: NumberUtil.toNumber(score.totalScore) }));
  }

  private async recentActivity(organizationId: string, take = 15) {
    const commits = await this.prisma.commit.findMany({
      where: { organizationId, isBot: false },
      orderBy: { committedAt: 'desc' },
      take,
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        repository: { select: { id: true, name: true } },
      },
    });
    return commits.map((commit) => ({
      type: 'commit' as const,
      at: commit.committedAt,
      author: commit.author,
      repository: commit.repository,
      message: commit.message?.slice(0, 140),
    }));
  }

  private async qualitySummary(organizationId: string) {
    const snapshots = await this.prisma.codeQualitySnapshot.findMany({
      where: { organizationId },
      orderBy: { snapshotDate: 'desc' },
      take: 50,
    });
    const seen = new Set<string>();
    const latest = snapshots.filter((snapshot) => {
      if (seen.has(snapshot.repositoryId)) return false;
      seen.add(snapshot.repositoryId);
      return true;
    });

    return {
      averageQuality: NumberUtil.average(latest.map((s) => NumberUtil.toNumber(s.qualityScore))),
      averageCoverage: NumberUtil.average(latest.map((s) => NumberUtil.toNumber(s.coveragePercent))),
      totalBugs: NumberUtil.sum(latest.map((s) => s.bugs)),
    };
  }

  private async rankingTrend(organizationId: string, periods = 6) {
    const history = await this.prisma.rankingHistory.findMany({
      where: { organizationId, subjectType: 'DEVELOPER' },
      orderBy: { periodStart: 'desc' },
      take: periods * 20,
    });
    const byPeriod = new Map<string, number[]>();
    for (const row of history) {
      const key = PeriodUtil.toDateOnly(row.periodStart);
      const scores = byPeriod.get(key) ?? [];
      scores.push(NumberUtil.toNumber(row.score));
      byPeriod.set(key, scores);
    }
    return [...byPeriod.entries()]
      .slice(0, periods)
      .reverse()
      .map(([period, scores]) => ({ period, averageScore: NumberUtil.average(scores) }));
  }

  private async aiSummary(organizationId: string) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const usage = await this.prisma.aiUsage.aggregate({
      where: { organizationId, usageDate: { gte: since } },
      _sum: { requestCount: true },
    });
    const byTool = await this.prisma.aiUsage.groupBy({
      by: ['toolName'],
      where: { organizationId, usageDate: { gte: since } },
      orderBy: { toolName: 'asc' },
      _sum: { requestCount: true },
    });

    return {
      totalRequests: usage._sum.requestCount ?? 0,
      byTool: byTool.map((row) => ({ tool: row.toolName, requests: row._sum.requestCount ?? 0 })),
      // Explicitly excluded from scoring, as required.
      note: 'AI analytics is informational only and is excluded from scoring.',
    };
  }
}
