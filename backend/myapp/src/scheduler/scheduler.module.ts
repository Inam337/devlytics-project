import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { GoalsModule } from '../goals/goals.module';
import { SyncModule } from '../sync/sync.module';
import { UsersModule } from '../users/users.module';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [ScheduleModule.forRoot(), SyncModule, UsersModule, GoalsModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
