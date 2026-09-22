import { Module } from '@nestjs/common';
import { ExperimentsController } from './experiments.controller';
import { ExperimentsService } from './experiments.service';
import { ImprovementInsightsController } from './improvement-insights.controller';
import { ImprovementInsightsService } from './improvement-insights.service';
import { ImprovementVerificationService } from './improvement-verification.service';
import { ImprovementsController } from './improvements.controller';
import { ImprovementsService } from './improvements.service';
import { MetricCalculationService } from './metric-calculation.service';
import { ProgressCalculationService } from './progress-calculation.service';

@Module({
  controllers: [
    ImprovementsController,
    ExperimentsController,
    ImprovementInsightsController,
  ],
  providers: [
    ImprovementsService,
    ExperimentsService,
    MetricCalculationService,
    ProgressCalculationService,
    ImprovementVerificationService,
    ImprovementInsightsService,
  ],
  exports: [ImprovementsService, ExperimentsService, MetricCalculationService],
})
export class ImprovementsModule {}
