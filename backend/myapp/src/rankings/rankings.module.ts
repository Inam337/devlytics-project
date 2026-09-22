import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE } from '../queue/queue.constants';
import { ScoringModule } from '../scoring/scoring.module';
import { RankingCalculationProcessor } from './processors/ranking-calculation.processor';
import { RankingsController } from './rankings.controller';
import { RankingsService } from './rankings.service';

@Module({
  imports: [
    ScoringModule,
    BullModule.registerQueue({ name: QUEUE.RANKING_CALCULATION }),
  ],
  controllers: [RankingsController],
  providers: [RankingsService, RankingCalculationProcessor],
  exports: [RankingsService],
})
export class RankingsModule {}
