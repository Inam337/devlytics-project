import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SyncModule } from '../sync/sync.module';
import { UsersModule } from '../users/users.module';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [ScheduleModule.forRoot(), SyncModule, UsersModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
