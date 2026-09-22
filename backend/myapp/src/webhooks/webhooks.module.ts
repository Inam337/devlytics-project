import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE } from '../queue/queue.constants';
import { SyncModule } from '../sync/sync.module';
import { WebhookProcessingProcessor } from './processors/webhook-processing.processor';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [
    SyncModule,
    BullModule.registerQueue({ name: QUEUE.WEBHOOK_PROCESSING }),
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhookProcessingProcessor],
})
export class WebhooksModule {}
