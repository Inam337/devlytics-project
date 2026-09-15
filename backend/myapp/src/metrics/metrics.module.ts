import { Module } from '@nestjs/common';
import { MetricsAggregationService } from './metrics-aggregation.service';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Module({
  controllers: [MetricsController],
  providers: [MetricsAggregationService, MetricsService],
  exports: [MetricsAggregationService, MetricsService],
})
export class MetricsModule {}
