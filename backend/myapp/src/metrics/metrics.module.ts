import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE } from '../queue/queue.constants';
import { MetricsAggregationService } from './metrics-aggregation.service';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { MetricsCalculationProcessor } from './processors/metrics-calculation.processor';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE.METRICS_CALCULATION })],
  controllers: [MetricsController],
  providers: [
    MetricsAggregationService,
    MetricsService,
    MetricsCalculationProcessor,
  ],
  exports: [MetricsAggregationService, MetricsService],
})
export class MetricsModule {}
