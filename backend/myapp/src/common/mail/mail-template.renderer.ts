import { MailTemplateInput, RenderedMail } from './mail.types';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Renders the shared template primitives (subject, preheader, body,
 * optional metric row, optional list, optional CTA, footer — devlytics.md
 * §8) into a self-contained HTML email plus a plain-text fallback.
 *
 * This is the rendering *mechanism* only. WOR-14 (transactional templates)
 * and WOR-15 (digest/milestone/alert templates) supply the sixteen events'
 * actual copy by building a `MailTemplateInput` and calling
 * `MailService#render` / `#sendTemplate` — no event-specific content lives
 * here, so new templates never require touching this file.
 */
export function renderMailTemplate(input: MailTemplateInput): RenderedMail {
  const preheaderHtml = input.preheader
    ? `<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preheader)}</span>`
    : '';

  const paragraphsHtml = input.bodyParagraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#1f2933;">${escapeHtml(paragraph)}</p>`,
    )
    .join('\n');

  const metricRowHtml = input.metricRows?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-collapse:collapse;">
        <tr>
          ${input.metricRows
            .map(
              (
                metric,
              ) => `<td style="padding:8px 12px;text-align:center;border:1px solid #e4e7eb;">
                <div style="font-size:20px;font-weight:600;color:#111827;">${escapeHtml(metric.value)}</div>
                <div style="font-size:12px;color:#6b7280;">${escapeHtml(metric.label)}</div>
                ${metric.delta ? `<div style="font-size:12px;color:#2563eb;">${escapeHtml(metric.delta)}</div>` : ''}
              </td>`,
            )
            .join('')}
        </tr>
      </table>`
    : '';

  const listHtml = input.list?.length
    ? `<ul style="margin:0 0 20px;padding-left:20px;">
        ${input.list
          .map(
            (item) =>
              `<li style="font-size:14px;color:#1f2933;margin-bottom:6px;">${escapeHtml(item.label)}${
                item.detail
                  ? ` — <span style="color:#6b7280;">${escapeHtml(item.detail)}</span>`
                  : ''
              }</li>`,
          )
          .join('')}
      </ul>`
    : '';

  const ctaHtml = input.cta
    ? `<p style="margin:0 0 24px;">
        <a href="${escapeHtml(input.cta.url)}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#ffffff;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">${escapeHtml(input.cta.label)}</a>
      </p>`
    : '';

  const footerHtml = input.footer
    ? `<p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">${escapeHtml(input.footer)}</p>`
    : '';

  const html = `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8" /><title>${escapeHtml(input.subject)}</title></head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
    ${preheaderHtml}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;padding:32px;">
            <tr>
              <td>
                ${paragraphsHtml}
                ${metricRowHtml}
                ${listHtml}
                ${ctaHtml}
                ${footerHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const textLines = [
    input.preheader,
    ...input.bodyParagraphs,
    ...(input.metricRows?.map(
      (metric) =>
        `${metric.label}: ${metric.value}${metric.delta ? ` (${metric.delta})` : ''}`,
    ) ?? []),
    ...(input.list?.map(
      (item) => `- ${item.label}${item.detail ? `: ${item.detail}` : ''}`,
    ) ?? []),
    input.cta ? `${input.cta.label}: ${input.cta.url}` : undefined,
    input.footer,
  ].filter((line): line is string => Boolean(line && line.length > 0));

  return { subject: input.subject, html, text: textLines.join('\n\n') };
}
