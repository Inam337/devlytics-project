import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { renderMailTemplate } from '../mail/mail-template.renderer';
import { SmtpMailAdapter } from '../mail/smtp-mail.adapter';
import {
  MailMessage,
  MailProviderAdapter,
  MailSendResult,
  MailTemplateInput,
  RenderedMail,
} from '../mail/mail.types';

const recipients = (to: string | string[]): string =>
  Array.isArray(to) ? to.join(', ') : to;

/**
 * SMTP email delivery (WOR-13) — the mail foundation WOR-14 (transactional
 * templates) and WOR-15 (digest/milestone/alert templates) build on, and the
 * EMAIL-channel leg of the notifications processor (WOR-8).
 *
 * Nodemailer/SMTP specifics live entirely behind `MailProviderAdapter`
 * (`SmtpMailAdapter`) — this service only knows the adapter interface, so a
 * different provider can be swapped in later without callers changing.
 *
 * Never throws: `send`/`sendTemplate` always resolve to a `MailSendResult`,
 * even when SMTP is unconfigured, unreachable, or a message is rejected —
 * a mail failure must never crash the notifications processor or roll back
 * the request that triggered it.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private readonly adapter: MailProviderAdapter;
  private readonly configured: boolean;
  private readonly host: string;

  constructor(private readonly config: ConfigService) {
    this.host = this.config.get<string>('mail.host') ?? '';
    this.configured = this.host.length > 0;
    this.adapter = new SmtpMailAdapter({
      host: this.host,
      port: this.config.get<number>('mail.port', 587),
      secure: this.config.get<boolean>('mail.secure', false),
      user: this.config.get<string>('mail.user') || undefined,
      password: this.config.get<string>('mail.password') || undefined,
      from: this.config.get<string>(
        'mail.from',
        'Devlytics <no-reply@devlytics.local>',
      ),
      connectionTimeoutMs: this.config.get<number>(
        'mail.connectionTimeoutMs',
        10_000,
      ),
    });
  }

  /**
   * Startup connectivity check — logs a warning on misconfiguration or an
   * unreachable host and always lets the app finish booting.
   */
  async onModuleInit(): Promise<void> {
    if (!this.configured) {
      this.logger.warn(
        'SMTP is not configured (SMTP_HOST is empty) — outbound email is disabled. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASSWORD/SMTP_FROM to enable delivery.',
      );
      return;
    }

    try {
      const ok = await this.adapter.verify();
      if (ok) {
        this.logger.log(`SMTP connectivity check passed for ${this.host}.`);
      } else {
        this.logger.warn(
          `SMTP connectivity check failed for ${this.host} — outbound email may not be delivered until this is fixed.`,
        );
      }
    } catch (error) {
      // Belt and braces: verify() already catches internally, but startup
      // must never fail because of a mail misconfiguration.
      this.logger.warn(
        `SMTP connectivity check threw unexpectedly: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Renders template primitives (subject/preheader/body/metric row/list/CTA/
   * footer) into subject/HTML/text. WOR-14/WOR-15 templates plug in here by
   * building a `MailTemplateInput` for their event and calling this (or
   * `sendTemplate`) — no template content is defined in this service.
   */
  render(input: MailTemplateInput): RenderedMail {
    return renderMailTemplate(input);
  }

  /** Renders and sends in one step. */
  async sendTemplate(
    to: string | string[],
    input: MailTemplateInput,
  ): Promise<MailSendResult> {
    const rendered = this.render(input);
    return this.send({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      attachments: input.attachments,
    });
  }

  /** Sends an already-rendered message. Never throws. */
  async send(message: MailMessage): Promise<MailSendResult> {
    if (!this.configured) {
      this.logger.warn(
        `Skipped email to ${recipients(message.to)} ("${message.subject}") — SMTP not configured.`,
      );
      return { success: false, error: 'SMTP not configured' };
    }

    try {
      const result = await this.adapter.send(message);
      if (!result.success) {
        this.logger.error(
          `Failed to send email to ${recipients(message.to)} ("${message.subject}"): ${result.error}`,
        );
      }
      return result;
    } catch (error) {
      // Defense in depth: SmtpMailAdapter#send already catches internally,
      // but a caller (e.g. NotificationsProcessor) must never see a throw.
      this.logger.error(
        `Unexpected mail send failure for ${recipients(message.to)}: ${(error as Error).message}`,
      );
      return { success: false, error: (error as Error).message };
    }
  }
}
