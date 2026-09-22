import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { QUEUE } from '../queue/queue.constants';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsProcessor } from './processors/notifications.processor';

/** Global so any module can raise a notification without a circular import. */
@Global()
@Module({
  imports: [BullModule.registerQueue({ name: QUEUE.NOTIFICATIONS })],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
