import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AchievementsModule } from './achievements/achievements.module';
import { AiModule } from './ai/ai.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { configuration } from './config/configuration';
import { validateEnv } from './config/env.validation';
import { DashboardModule } from './dashboard/dashboard.module';
import { DatabaseModule } from './database/database.module';
import { DepartmentsModule } from './departments/departments.module';
import { GitModule } from './git/git.module';
import { GoalsModule } from './goals/goals.module';
import { HealthModule } from './health/health.module';
import { ImprovementsModule } from './improvements/improvements.module';
import { MetricsModule } from './metrics/metrics.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ProjectsModule } from './projects/projects.module';
import { QualityModule } from './quality/quality.module';
import { QueueModule } from './queue/queue.module';
import { RankingsModule } from './rankings/rankings.module';
import { ReportsModule } from './reports/reports.module';
import { RolesModule } from './roles/roles.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { ScoringModule } from './scoring/scoring.module';
import { SelfEvaluationsModule } from './self-evaluations/self-evaluations.module';
import { SyncModule } from './sync/sync.module';
import { TeamsModule } from './teams/teams.module';
import { UsersModule } from './users/users.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
      cache: true,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('security.throttleTtlSeconds', 60) * 1000,
            limit: config.get<number>('security.throttleLimit', 120),
          },
        ],
      }),
    }),

    // Infrastructure
    DatabaseModule,
    CommonModule,
    QueueModule,
    AuditModule,
    NotificationsModule,

    // Identity & organization structure
    HealthModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    RolesModule,
    DepartmentsModule,
    TeamsModule,
    ProjectsModule,

    // Git integration and sync pipeline
    GitModule,
    SyncModule,
    WebhooksModule,

    // Metrics, quality, scoring, rankings
    MetricsModule,
    QualityModule,
    ScoringModule,
    RankingsModule,

    // AI, improvements, self-evaluation, goals, achievements
    AiModule,
    ImprovementsModule,
    SelfEvaluationsModule,
    GoalsModule,
    AchievementsModule,

    // Reporting
    DashboardModule,
    ReportsModule,

    // Scheduled automation
    SchedulerModule,
  ],
  providers: [
    // Order matters: authenticate, then authorize, then rate-limit.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
