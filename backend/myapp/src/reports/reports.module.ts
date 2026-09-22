import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MetricsModule } from '../metrics/metrics.module';
import { QUEUE } from '../queue/queue.constants';
import { ReportGenerationProcessor } from './processors/report-generation.processor';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    MetricsModule,
    BullModule.registerQueue({ name: QUEUE.REPORT_GENERATION }),
  ],
  controllers: [ReportsController],
  providers: [ReportsService, ReportGenerationProcessor],
  exports: [ReportsService],
})
export class ReportsModule {}
