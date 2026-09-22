import { MailTemplateInput } from '../mail/mail.types';

/**
 * The five Transactional templates from devlytics.md §8 (WOR-14). Each is a
 * pure mapper — event data in, `MailTemplateInput` out — following the same
 * contract WOR-13's renderer expects (subject/preheader/body/optional metric
 * row/optional list/CTA/footer). WOR-15's eleven Digest/Milestone/Alert
 * templates should follow this same file-per-category, function-per-event
 * shape.
 *
 * None of these carry an attachment — devlytics.md §7 reserves PDF
 * attachments for the two AI-analysis report emails (WOR-15).
 */

const FOOTER =
  'You are receiving this email because of activity on your Devlytics account. If this was not you, please contact your organization admin.';

export interface OrganizationCreatedMailData {
  recipientFirstName: string;
  organizationName: string;
  organizationSlug: string;
  ctaUrl: string;
}

export function organizationCreatedMail(
  data: OrganizationCreatedMailData,
): MailTemplateInput {
  return {
    subject: `${data.organizationName} is ready on Devlytics`,
    preheader:
      'Your organization has been created. Connect a Git provider to start collecting engineering evidence.',
    bodyParagraphs: [
      `Hi ${data.recipientFirstName},`,
      `Your organization "${data.organizationName}" (${data.organizationSlug}) has been created and you are its Organization Admin.`,
      'Here is what to do next to start collecting engineering evidence:',
    ],
    list: [
      { label: 'Connect a Git provider', detail: 'GitHub or GitLab' },
      { label: 'Import repositories', detail: 'so activity can be scored' },
      { label: 'Invite your team', detail: 'developers, leads and admins' },
    ],
    cta: { label: 'Go to onboarding', url: data.ctaUrl },
    footer: FOOTER,
  };
}

export interface DeveloperInvitationMailData {
  recipientFirstName: string;
  organizationName: string;
  roleName: string;
  ctaUrl: string;
}

export function developerInvitationMail(
  data: DeveloperInvitationMailData,
): MailTemplateInput {
  return {
    subject: `You have been invited to ${data.organizationName} on Devlytics`,
    preheader: `Set a password to activate your ${data.roleName} account.`,
    bodyParagraphs: [
      `Hi ${data.recipientFirstName},`,
      `You have been invited to join "${data.organizationName}" on Devlytics.`,
      'Set a password to activate your account and get access.',
    ],
    list: [
      { label: 'Organization', detail: data.organizationName },
      { label: 'Role', detail: data.roleName },
    ],
    cta: { label: 'Accept invitation', url: data.ctaUrl },
    footer: FOOTER,
  };
}

export interface PasswordResetMailData {
  recipientFirstName: string;
  expiresInMinutes: number;
  ctaUrl: string;
}

export function passwordResetMail(
  data: PasswordResetMailData,
): MailTemplateInput {
  return {
    subject: 'Reset your Devlytics password',
    preheader: `This single-use link expires in ${data.expiresInMinutes} minutes.`,
    bodyParagraphs: [
      `Hi ${data.recipientFirstName},`,
      'We received a request to reset your Devlytics password.',
      `This link can only be used once and expires in ${data.expiresInMinutes} minutes. If you did not request this, you can safely ignore this email — your password will not change.`,
    ],
    cta: { label: 'Reset your password', url: data.ctaUrl },
    footer: FOOTER,
  };
}

export interface AddedToTeamMailData {
  recipientFirstName: string;
  teamName: string;
  teamCode: string;
  positionTitle?: string;
  ctaUrl: string;
}

export function addedToTeamMail(data: AddedToTeamMailData): MailTemplateInput {
  return {
    subject: `You joined ${data.teamName}`,
    preheader: `You were added to the team ${data.teamName} (${data.teamCode}).`,
    bodyParagraphs: [
      `Hi ${data.recipientFirstName},`,
      `You have been added to the team "${data.teamName}" (${data.teamCode}).`,
    ],
    list: [
      { label: 'Team', detail: `${data.teamName} (${data.teamCode})` },
      ...(data.positionTitle
        ? [{ label: 'Position', detail: data.positionTitle }]
        : []),
    ],
    cta: { label: 'View team', url: data.ctaUrl },
    footer: FOOTER,
  };
}

export interface AssignedToProjectMailData {
  recipientFirstName: string;
  projectName: string;
  roleLabel?: string;
  allocationPercent: number;
  ctaUrl: string;
}

export function assignedToProjectMail(
  data: AssignedToProjectMailData,
): MailTemplateInput {
  return {
    subject: `You were assigned to ${data.projectName}`,
    preheader: data.roleLabel
      ? `You joined ${data.projectName} as ${data.roleLabel}.`
      : `You joined ${data.projectName}.`,
    bodyParagraphs: [
      `Hi ${data.recipientFirstName},`,
      data.roleLabel
        ? `You have been assigned to the project "${data.projectName}" as ${data.roleLabel}.`
        : `You have been assigned to the project "${data.projectName}".`,
    ],
    metricRows: [
      {
        label: 'Allocation',
        value: `${data.allocationPercent}%`,
      },
    ],
    cta: { label: 'View project', url: data.ctaUrl },
    footer: FOOTER,
  };
}
