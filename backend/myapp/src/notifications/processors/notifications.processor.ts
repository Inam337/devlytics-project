import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaseJobData, QUEUE } from '../../queue/queue.constants';
import { NotificationsService, NotifyInput } from '../notifications.service';

interface NotificationsJobData extends BaseJobData {
  inputs: NotifyInput[];
}

/**
 * Consumes `notifications` queue jobs enqueued by
 * `NotificationsService#notify`/`#notifyMany` — the one place `tbl_notification`
 * rows actually get written, off the request/service call path that
 * triggered them.
 *
 * Email fan-out (WOR-13) hooks in here once it exists: for inputs whose
 * `channel` is `EMAIL`, hand off to the mail service after persisting the
 * in-app row. Not wired yet — WOR-13 hasn't landed.
 */
@Processor(QUEUE.NOTIFICATIONS)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly notifications: NotificationsService) {
    super();
  }

  async process(job: Job<NotificationsJobData>): Promise<void> {
    const { inputs } = job.data;
    await this.notifications.persist(inputs);
    this.logger.log(`Delivered ${inputs.length} notification(s)`);
  }
}
