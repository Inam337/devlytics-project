import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QualityModule } from '../quality/quality.module';
import { QUEUE } from '../queue/queue.constants';
import { AiAnalysisService } from './ai-analysis.service';
import { AiProvidersService } from './ai-providers.service';
import { AiController } from './ai.controller';
import { AiAnalysisProcessor } from './processors/ai-analysis.processor';

@Module({
  imports: [
    QualityModule,
    BullModule.registerQueue({ name: QUEUE.AI_ANALYSIS }),
  ],
  controllers: [AiController],
  providers: [AiProvidersService, AiAnalysisService, AiAnalysisProcessor],
  exports: [AiProvidersService, AiAnalysisService],
})
export class AiModule {}
