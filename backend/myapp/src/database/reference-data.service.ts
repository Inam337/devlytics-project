import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ALL_PERMISSIONS, permissionParts } from '../common/constants/permissions';
import { PrismaService } from './prisma.service';

/**
 * Global, organization-independent reference data: the permission catalog and
 * the achievement definitions. Both are upserted on boot so a clean database is
 * usable straight after `prisma migrate deploy`, with no manual seed step.
 */
@Injectable()
export class ReferenceDataService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ReferenceDataService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.SKIP_REFERENCE_DATA === 'true') return;
    await this.sync();
  }

  async sync(): Promise<void> {
    const [permissions, achievements] = await Promise.all([
      this.syncPermissions(),
      this.syncAchievements(),
    ]);
    this.logger.log(
      `Reference data ready: ${permissions} permissions, ${achievements} achievements`,
    );
  }

  private async syncPermissions(): Promise<number> {
    await this.prisma.$transaction(
      ALL_PERMISSIONS.map((key) => {
        const { resource, action } = permissionParts(key);
        return this.prisma.permission.upsert({
          where: { key },
          update: { resource, action },
          create: { key, resource, action, description: `${action} on ${resource}` },
        });
      }),
    );
    return ALL_PERMISSIONS.length;
  }

  private async syncAchievements(): Promise<number> {
    await this.prisma.$transaction(
      ACHIEVEMENT_CATALOG.map((achievement) =>
        this.prisma.achievement.upsert({
          where: { key: achievement.key },
          update: {
            name: achievement.name,
            description: achievement.description,
            category: achievement.category,
            metricKey: achievement.metricKey,
            targetValue: achievement.targetValue,
            points: achievement.points,
            icon: achievement.icon,
          },
          create: achievement,
        }),
      ),
    );
    return ACHIEVEMENT_CATALOG.length;
  }
}

/**
 * The ten badges shown on the Achievements screen. `metricKey` is resolved by
 * `AchievementsService` against measured evidence — a badge is never awarded by
 * hand.
 */
export const ACHIEVEMENT_CATALOG = [
  {
    key: 'first_commit',
    name: 'First Commit',
    description: 'Land your first analysed commit',
    icon: 'flag',
    category: 'Activity',
    metricKey: 'commits',
    targetValue: 1,
    points: 5,
  },
  {
    key: 'century_commits',
    name: 'Century',
    description: 'Author 100 commits',
    icon: 'git-commit',
    category: 'Activity',
    metricKey: 'commits',
    targetValue: 100,
    points: 15,
  },
  {
    key: 'merge_master',
    name: 'Merge Master',
    description: 'Get 100 pull requests merged',
    icon: 'git-merge',
    category: 'Delivery',
    metricKey: 'prs_merged',
    targetValue: 100,
    points: 20,
  },
  {
    key: 'review_champion',
    name: 'Review Champion',
    description: 'Give 50 code reviews',
    icon: 'eye',
    category: 'Code Review',
    metricKey: 'reviews_given',
    targetValue: 50,
    points: 20,
  },
  {
    key: 'bug_crusher',
    name: 'Bug Crusher',
    description: 'Resolve 55 reported bugs',
    icon: 'bug',
    category: 'Reliability',
    metricKey: 'issues_resolved',
    targetValue: 55,
    points: 20,
  },
  {
    key: 'test_guardian',
    name: 'Test Guardian',
    description: 'Add 100 tests',
    icon: 'shield',
    category: 'Testing',
    metricKey: 'tests_added',
    targetValue: 100,
    points: 20,
  },
  {
    key: 'quality_keeper',
    name: 'Quality Keeper',
    description: 'Hold a code-quality score of 85 or better',
    icon: 'award',
    category: 'Code Quality',
    metricKey: 'quality_score',
    targetValue: 85,
    points: 25,
  },
  {
    key: 'coverage_hero',
    name: 'Coverage Hero',
    description: 'Reach 80% test coverage on an owned repository',
    icon: 'target',
    category: 'Testing',
    metricKey: 'coverage_percent',
    targetValue: 80,
    points: 25,
  },
  {
    key: 'documentation_advocate',
    name: 'Documentation Advocate',
    description: 'Make 50 documentation changes',
    icon: 'book',
    category: 'Documentation',
    metricKey: 'docs_changed',
    targetValue: 50,
    points: 15,
  },
  {
    key: 'goal_finisher',
    name: 'Goal Finisher',
    description: 'Complete 5 improvement goals verified by re-analysis',
    icon: 'check-circle',
    category: 'Improvement',
    metricKey: 'goals_completed',
    targetValue: 5,
    points: 30,
  },
] as const;
