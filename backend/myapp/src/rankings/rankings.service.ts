import { Injectable, Logger } from '@nestjs/common';
import { Prisma, RankingPeriod, RankingSubjectType } from '@prisma/client';
import { NumberUtil } from '../common/utils/number.util';
import { PeriodUtil } from '../common/utils/period.util';
import { PrismaService } from '../database/prisma.service';
import {
  NOTIFICATION_CATEGORY as _unused,
  NotificationEvent,
  RANK_CHANGE_THRESHOLD,
} from '../notifications/notification-events';
import { NotificationsService } from '../notifications/notifications.service';
import { RankingsQueryDto } from './dto/rankings-query.dto';

void _unused;

/**
 * Leaderboard positions (sync pipeline stage 5, tail end) plus their read side.
 *
 * Rankings are computed from already-persisted `tbl_developer_score` /
 * `tbl_team_score` rows for one weight version and period, and stored in
 * `tbl_ranking_history` — a versioned, append-only record so changing weights
 * never rewrites past standings.
 */
@Injectable()
export class RankingsService {
  private readonly logger = new Logger(RankingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async closePeriod(
    organizationId: string,
    period: RankingPeriod,
    reference: Date = new Date(),
  ): Promise<{ developers: number; teams: number }> {
    const range = PeriodUtil.resolve(period, reference);
    const previousRange = PeriodUtil.previous(period, reference);

    const developerCount = await this.closeSubject(
      organizationId,
      'DEVELOPER',
      period,
      range,
      previousRange,
    );
    const teamCount = await this.closeSubject(
      organizationId,
      'TEAM',
      period,
      range,
      previousRange,
    );

    return { developers: developerCount, teams: teamCount };
  }

  private async closeSubject(
    organizationId: string,
    subjectType: RankingSubjectType,
    period: RankingPeriod,
    range: ReturnType<typeof PeriodUtil.resolve>,
    previousRange: ReturnType<typeof PeriodUtil.resolve>,
  ): Promise<number> {
    const scores =
      subjectType === 'DEVELOPER'
        ? await this.prisma.developerScore.findMany({
            where: { organizationId, period, periodStart: range.start },
            orderBy: { totalScore: 'desc' },
          })
        : await this.prisma.teamScore.findMany({
            where: { organizationId, period, periodStart: range.start },
            orderBy: { totalScore: 'desc' },
          });

    if (scores.length === 0) return 0;

    const weightVersion = scores[0].weightVersion;
    const previousRanks = await this.prisma.rankingHistory.findMany({
      where: {
        organizationId,
        subjectType,
        period,
        periodStart: previousRange.start,
      },
    });
    const previousBySubject = new Map(
      previousRanks.map((row) => [
        subjectType === 'DEVELOPER' ? row.userId : row.teamId,
        row.rank,
      ]),
    );

    const rows = scores.map((score, index) => {
      const subjectId =
        subjectType === 'DEVELOPER'
          ? (score as { userId: string }).userId
          : (score as { teamId: string }).teamId;
      const rank = index + 1;
      const previousRank = previousBySubject.get(subjectId) ?? null;
      return {
        subjectId,
        rank,
        previousRank,
        rankDelta: previousRank ? previousRank - rank : 0,
        score: NumberUtil.toNumber(score.totalScore),
      };
    });

    await this.prisma.$transaction(
      rows.map((row) =>
        this.prisma.rankingHistory.upsert({
          where: {
            ranking_subject_period_unique: {
              organizationId,
              subjectType,
              subjectId: row.subjectId,
              period,
              periodStart: range.start,
              weightVersion,
            },
          },
          update: {
            rank: row.rank,
            previousRank: row.previousRank,
            rankDelta: row.rankDelta,
            score: new Prisma.Decimal(row.score),
            totalSubjects: rows.length,
          },
          create: {
            organizationId,
            subjectType,
            subjectId: row.subjectId,
            userId: subjectType === 'DEVELOPER' ? row.subjectId : null,
            teamId: subjectType === 'TEAM' ? row.subjectId : null,
            period,
            periodStart: range.start,
            periodEnd: range.end,
            weightVersion,
            rank: row.rank,
            previousRank: row.previousRank,
            rankDelta: row.rankDelta,
            score: new Prisma.Decimal(row.score),
            totalSubjects: rows.length,
          },
        }),
      ),
    );

    if (subjectType === 'DEVELOPER') {
      await this.notifyRankChanges(organizationId, rows);
    }

    return rows.length;
  }

  /** Rank-change milestone: only moves of 2+ places are worth telling someone about. */
  private async notifyRankChanges(
    organizationId: string,
    rows: { subjectId: string; rank: number; rankDelta: number }[],
  ) {
    const significant = rows.filter(
      (row) => Math.abs(row.rankDelta) >= RANK_CHANGE_THRESHOLD,
    );
    await this.notifications.notifyMany(
      significant.map((row) => ({
        organizationId,
        userId: row.subjectId,
        event: NotificationEvent.RANK_CHANGE,
        title:
          row.rankDelta > 0
            ? `You moved up to #${row.rank}`
            : `You moved to #${row.rank}`,
        body:
          row.rankDelta > 0
            ? `You climbed ${row.rankDelta} places on the leaderboard.`
            : `You dropped ${Math.abs(row.rankDelta)} places on the leaderboard.`,
        actionUrl: '/leaderboards/developers',
      })),
    );
  }

  async developerLeaderboard(organizationId: string, query: RankingsQueryDto) {
    return this.leaderboard(organizationId, 'DEVELOPER', query);
  }

  async teamLeaderboard(organizationId: string, query: RankingsQueryDto) {
    return this.leaderboard(organizationId, 'TEAM', query);
  }

  private async leaderboard(
    organizationId: string,
    subjectType: RankingSubjectType,
    query: RankingsQueryDto,
  ) {
    const period = query.period ?? 'MONTHLY';
    const range = PeriodUtil.resolve(
      period,
      query.date ? new Date(query.date) : new Date(),
    );

    const rankings = await this.prisma.rankingHistory.findMany({
      where: {
        organizationId,
        subjectType,
        period,
        periodStart: range.start,
        ...(query.teamId && subjectType === 'DEVELOPER'
          ? { user: { teamMemberships: { some: { teamId: query.teamId } } } }
          : {}),
        ...(query.departmentId
          ? { team: { departmentId: query.departmentId } }
          : {}),
      },
      orderBy: { rank: 'asc' },
      take: query.limit,
      skip: query.skip,
      include:
        subjectType === 'DEVELOPER'
          ? {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                  teamMemberships: {
                    select: { team: { select: { id: true, name: true } } },
                  },
                },
              },
            }
          : {
              team: {
                select: { id: true, name: true, code: true, teamColor: true },
              },
            },
    });

    const scores =
      subjectType === 'DEVELOPER'
        ? await this.prisma.developerScore.findMany({
            where: {
              organizationId,
              period,
              periodStart: range.start,
              userId: {
                in: rankings
                  .map((r) => r.userId)
                  .filter((id): id is string => Boolean(id)),
              },
            },
          })
        : await this.prisma.teamScore.findMany({
            where: {
              organizationId,
              period,
              periodStart: range.start,
              teamId: {
                in: rankings
                  .map((r) => r.teamId)
                  .filter((id): id is string => Boolean(id)),
              },
            },
          });

    const scoreBySubject = new Map<string, (typeof scores)[number]>(
      scores.map((score): [string, (typeof scores)[number]] => [
        subjectType === 'DEVELOPER'
          ? (score as { userId: string }).userId
          : (score as { teamId: string }).teamId,
        score,
      ]),
    );

    return {
      period,
      periodStart: PeriodUtil.toDateOnly(range.start),
      periodEnd: PeriodUtil.toDateOnly(range.end),
      entries: rankings.map((ranking) => {
        const subjectId =
          subjectType === 'DEVELOPER' ? ranking.userId! : ranking.teamId!;
        const score = scoreBySubject.get(subjectId);
        return {
          rank: ranking.rank,
          previousRank: ranking.previousRank,
          rankDelta: ranking.rankDelta,
          score: NumberUtil.toNumber(ranking.score),
          subject:
            subjectType === 'DEVELOPER'
              ? (ranking as { user?: unknown }).user
              : (ranking as { team?: unknown }).team,
          breakdown: score
            ? {
                codeQuality: NumberUtil.toNumber(
                  (score as { codeQualityScore: Prisma.Decimal })
                    .codeQualityScore,
                ),
                delivery: NumberUtil.toNumber(
                  (score as { deliveryScore: Prisma.Decimal }).deliveryScore,
                ),
                codeReview: NumberUtil.toNumber(
                  (score as { codeReviewScore: Prisma.Decimal })
                    .codeReviewScore,
                ),
                testing: NumberUtil.toNumber(
                  (score as { testingScore: Prisma.Decimal }).testingScore,
                ),
              }
            : null,
        };
      }),
    };
  }

  async history(organizationId: string, query: RankingsQueryDto) {
    const where: Prisma.RankingHistoryWhereInput = {
      organizationId,
      ...(query.subjectType ? { subjectType: query.subjectType } : {}),
      ...(query.period ? { period: query.period } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.teamId ? { teamId: query.teamId } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.rankingHistory.findMany({
        where,
        orderBy: { periodStart: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.rankingHistory.count({ where }),
    ]);

    return { items, total };
  }
}
