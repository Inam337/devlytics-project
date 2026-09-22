import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE } from '../queue/queue.constants';
import { QualityAnalysisProcessor } from './processors/quality-analysis.processor';
import { QualityAnalysisService } from './quality-analysis.service';
import { QualityController } from './quality.controller';
import { QualityService } from './quality.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE.QUALITY_ANALYSIS }),
    BullModule.registerQueue({ name: QUEUE.IMPROVEMENT_PROGRESS }),
  ],
  controllers: [QualityController],
  providers: [QualityAnalysisService, QualityService, QualityAnalysisProcessor],
  exports: [QualityAnalysisService, QualityService],
})
export class QualityModule {}
