/**
 * Provider-neutral mail contracts (WOR-13). These are the rendering
 * primitives devlytics.md §8's sixteen notification templates are built
 * from — subject, preheader, body, an optional metric row, an optional
 * list, an optional CTA, a footer, and an optional attachment (e.g. a PDF
 * report). WOR-14/WOR-15 supply the actual template copy for each of the
 * sixteen events; nothing template-specific lives here.
 */

export interface MailAttachment {
  filename: string;
  /** Raw bytes or a pre-encoded string (e.g. base64) — passed through as-is to the transport. */
  content: Buffer | string;
  contentType?: string;
}

export interface MailMetricRow {
  label: string;
  value: string;
  /** e.g. "+12%" or "-3 issues" — rendered as a small accent line under the value. */
  delta?: string;
}

export interface MailListItem {
  label: string;
  detail?: string;
}

export interface MailCta {
  label: string;
  url: string;
}

/**
 * The shared shape every notification email is built from. A WOR-14/WOR-15
 * template is just a function that returns one of these for a given event's
 * data — `MailService#render` (backed by `renderMailTemplate`) turns it into
 * an actual subject/HTML/text triple.
 */
export interface MailTemplateInput {
  subject: string;
  preheader?: string;
  bodyParagraphs: string[];
  metricRows?: MailMetricRow[];
  list?: MailListItem[];
  cta?: MailCta;
  footer?: string;
  attachments?: MailAttachment[];
}

export interface RenderedMail {
  subject: string;
  html: string;
  text: string;
}

/** The fully-resolved payload handed to a provider adapter's `send`. */
export interface MailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: MailAttachment[];
}

export interface MailSendResult {
  success: boolean;
  messageId?: string;
  /** Populated by test/disposable providers (e.g. Ethereal) that offer a hosted preview. */
  previewUrl?: string;
  error?: string;
}

/**
 * Contract every mail transport implements. Nodemailer/SMTP is the only
 * implementation today (`SmtpMailAdapter`); a future provider (SES,
 * Postmark, ...) can implement this same interface without `MailService`
 * changing, mirroring the git/AI provider adapter pattern.
 */
export interface MailProviderAdapter {
  send(message: MailMessage): Promise<MailSendResult>;
  /** Connectivity/auth check used for the startup health check. Never throws. */
  verify(): Promise<boolean>;
}
