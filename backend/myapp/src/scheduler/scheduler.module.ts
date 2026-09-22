import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { GoalsModule } from '../goals/goals.module';
import { QUEUE } from '../queue/queue.constants';
import { ReportsModule } from '../reports/reports.module';
import { SyncModule } from '../sync/sync.module';
import { UsersModule } from '../users/users.module';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.registerQueue({ name: QUEUE.RANKING_CALCULATION }),
    SyncModule,
    UsersModule,
    GoalsModule,
    ReportsModule,
  ],
  providers: [SchedulerService],
})
export class SchedulerModule {}
