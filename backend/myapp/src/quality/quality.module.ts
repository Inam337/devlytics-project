import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE } from '../queue/queue.constants';
import { QualityAnalysisService } from './quality-analysis.service';
import { QualityController } from './quality.controller';
import { QualityService } from './quality.service';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE.QUALITY_ANALYSIS })],
  controllers: [QualityController],
  providers: [QualityAnalysisService, QualityService],
  exports: [QualityAnalysisService, QualityService],
})
export class QualityModule {}
