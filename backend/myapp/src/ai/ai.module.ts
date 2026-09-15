import { Module } from '@nestjs/common';
import { QualityModule } from '../quality/quality.module';
import { AiAnalysisService } from './ai-analysis.service';
import { AiProvidersService } from './ai-providers.service';
import { AiController } from './ai.controller';

@Module({
  imports: [QualityModule],
  controllers: [AiController],
  providers: [AiProvidersService, AiAnalysisService],
  exports: [AiProvidersService, AiAnalysisService],
})
export class AiModule {}
