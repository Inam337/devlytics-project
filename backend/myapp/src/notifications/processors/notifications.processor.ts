import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MailService } from '../../common/services/mail.service';
import { PrismaService } from '../../database/prisma.service';
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
 * EMAIL-channel inputs also get a generic email after the in-app row is
 * persisted (WOR-13), reusing the title/body/actionUrl already on
 * `NotifyInput` via `MailService#render`. This is intentionally generic —
 * no per-event template content lives here. WOR-14/WOR-15 supply richer,
 * event-specific copy for the sixteen documented templates and can replace
 * this pass-through per event once they land.
 */
@Processor(QUEUE.NOTIFICATIONS)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {
    super();
  }

  async process(job: Job<NotificationsJobData>): Promise<void> {
    const { inputs } = job.data;
    await this.notifications.persist(inputs);
    this.logger.log(`Delivered ${inputs.length} notification(s)`);
    await this.deliverEmails(inputs);
  }

  private async deliverEmails(inputs: NotifyInput[]): Promise<void> {
    const emailInputs = inputs.filter((input) => input.channel === 'EMAIL');

    for (const input of emailInputs) {
      // A single bad/unreachable recipient or a mail outage must never fail
      // the job or roll back the in-app notification already persisted.
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: input.userId },
          select: { email: true },
        });
        if (!user?.email) continue;

        const rendered = this.mail.render({
          subject: input.title,
          bodyParagraphs: [input.body],
          cta: input.actionUrl
            ? { label: 'View in Devlytics', url: input.actionUrl }
            : undefined,
          footer:
            'You are receiving this email because of your Devlytics notification preferences.',
        });

        const result = await this.mail.send({
          to: user.email,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
        });
        if (!result.success) {
          this.logger.warn(
            `Email delivery failed for user ${input.userId} (event ${input.event}): ${result.error}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Unexpected error emailing user ${input.userId} (event ${input.event}): ${(error as Error).message}`,
        );
      }
    }
  }
}
