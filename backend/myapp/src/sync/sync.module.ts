import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AchievementsModule } from '../achievements/achievements.module';
import { GitCoreModule } from '../git/git-core.module';
import { GoalsModule } from '../goals/goals.module';
import { ImprovementsModule } from '../improvements/improvements.module';
import { MetricsModule } from '../metrics/metrics.module';
import { QUEUE } from '../queue/queue.constants';
import { QualityModule } from '../quality/quality.module';
import { CollectorService } from './collector.service';
import { GitSyncProcessor } from './processors/git-sync.processor';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE.GIT_SYNC }),
    BullModule.registerQueue({ name: QUEUE.RANKING_CALCULATION }),
    GitCoreModule,
    MetricsModule,
    QualityModule,
    GoalsModule,
    AchievementsModule,
    ImprovementsModule,
  ],
  controllers: [SyncController],
  providers: [SyncService, CollectorService, GitSyncProcessor],
  exports: [SyncService, CollectorService],
})
export class SyncModule {}
