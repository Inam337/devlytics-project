import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE } from '../queue/queue.constants';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';
import { ImprovementProgressProcessor } from './processors/improvement-progress.processor';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE.IMPROVEMENT_PROGRESS })],
  controllers: [GoalsController],
  providers: [GoalsService, ImprovementProgressProcessor],
  exports: [GoalsService],
})
export class GoalsModule {}
