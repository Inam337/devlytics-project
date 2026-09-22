import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { MailMessage, MailProviderAdapter, MailSendResult } from './mail.types';

export interface SmtpAdapterConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  from: string;
  connectionTimeoutMs: number;
}

/**
 * Nodemailer-backed SMTP implementation of `MailProviderAdapter`. All
 * nodemailer/SMTP specifics are isolated here so `MailService` only ever
 * talks to the adapter interface — the same spirit as
 * `src/git/providers/*.adapter.ts` and `src/ai/providers/*.adapter.ts`. A
 * future provider (SES, Postmark, ...) implements this same interface
 * without `MailService` changing.
 */
export class SmtpMailAdapter implements MailProviderAdapter {
  private readonly logger = new Logger(SmtpMailAdapter.name);
  private readonly transporter: Transporter;

  constructor(private readonly cfg: SmtpAdapterConfig) {
    this.transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: cfg.user ? { user: cfg.user, pass: cfg.password } : undefined,
      connectionTimeout: cfg.connectionTimeoutMs,
      greetingTimeout: cfg.connectionTimeoutMs,
    });
  }

  /** Connectivity/auth check used at startup — never throws, only reports. */
  async verify(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      this.logger.warn(
        `SMTP connectivity check failed for ${this.cfg.host}:${this.cfg.port}: ${(error as Error).message}`,
      );
      return false;
    }
  }

  async send(message: MailMessage): Promise<MailSendResult> {
    try {
      const info = await this.transporter.sendMail({
        from: this.cfg.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        replyTo: message.replyTo,
        attachments: message.attachments?.map((attachment) => ({
          filename: attachment.filename,
          content: attachment.content,
          contentType: attachment.contentType,
        })),
      });

      return {
        success: true,
        messageId: info.messageId,
        // Populated only for disposable/test providers (e.g. Ethereal); a
        // production SMTP provider returns false and previewUrl stays unset.
        previewUrl: nodemailer.getTestMessageUrl(info) || undefined,
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}
