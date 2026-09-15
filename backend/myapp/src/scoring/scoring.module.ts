import { Module } from '@nestjs/common';
import { MetricsModule } from '../metrics/metrics.module';
import { ScoringController } from './scoring.controller';
import { ScoringService } from './scoring.service';

@Module({
  imports: [MetricsModule],
  controllers: [ScoringController],
  providers: [ScoringService],
  exports: [ScoringService],
})
export class ScoringModule {}
