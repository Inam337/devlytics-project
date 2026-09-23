import { MailTemplateInput } from '../mail/mail.types';

/**
 * WOR-15's eleven Digest/Milestone/Alert templates from devlytics.md §8:
 *   Digest (6): analysis run complete, weekly developer summary, team
 *     leaderboard digest, project completion summary, AI analysis report
 *     (team), AI analysis report (individual).
 *   Milestone (3): rank change, achievement earned, improvement goal
 *     completed.
 *   Alert (2): sync failure, scoring rules changed.
 *
 * Same pure-mapper contract as `transactional.templates.ts` (WOR-14): event
 * data in, `MailTemplateInput` out. The two AI-analysis report templates are
 * the only ones in the whole notification system that carry an attachment
 * (devlytics.md §7) — the PDF itself is built by the caller and passed in as
 * `MailAttachment`, not by these functions.
 */

const FOOTER =
  'You are receiving this email because of activity on your Devlytics account. If this was not you, please contact your organization admin.';

// ---------------------------------------------------------------------------
// Digest (6)
// ---------------------------------------------------------------------------

export interface AnalysisRunCompleteMailData {
  recipientFirstName: string;
  repositoryName: string;
  runNumber: number;
  issuesFound: number;
  ctaUrl: string;
}

export function analysisRunCompleteMail(
  data: AnalysisRunCompleteMailData,
): MailTemplateInput {
  return {
    subject: `AI analysis complete for ${data.repositoryName}`,
    preheader: `Run #${data.runNumber} finished with ${data.issuesFound} finding(s).`,
    bodyParagraphs: [
      `Hi ${data.recipientFirstName},`,
      `The AI analysis run you requested for "${data.repositoryName}" has finished.`,
    ],
    metricRows: [
      { label: 'Run', value: `#${data.runNumber}` },
      { label: 'Findings', value: String(data.issuesFound) },
    ],
    cta: { label: 'View analysis', url: data.ctaUrl },
    footer: FOOTER,
  };
}

export interface WeeklyDeveloperSummaryMailData {
  recipientFirstName: string;
  periodLabel: string;
  ctaUrl: string;
}

export function weeklyDeveloperSummaryMail(
  data: WeeklyDeveloperSummaryMailData,
): MailTemplateInput {
  return {
    subject: 'Your performance summary is ready',
    preheader: `Your ${data.periodLabel} performance summary has been generated.`,
    bodyParagraphs: [
      `Hi ${data.recipientFirstName},`,
      `Your ${data.periodLabel} performance summary is ready, covering your measured contributions, code quality and leaderboard standing for the period.`,
    ],
    cta: { label: 'View your summary', url: data.ctaUrl },
    footer: FOOTER,
  };
}

export interface TeamLeaderboardDigestMailData {
  recipientFirstName: string;
  teamName: string;
  periodLabel: string;
  ctaUrl: string;
}

export function teamLeaderboardDigestMail(
  data: TeamLeaderboardDigestMailData,
): MailTemplateInput {
  return {
    subject: `${data.teamName} — leaderboard digest`,
    preheader: `Your team's ${data.periodLabel} leaderboard digest is ready.`,
    bodyParagraphs: [
      `Hi ${data.recipientFirstName},`,
      `The ${data.periodLabel} leaderboard digest for "${data.teamName}" is ready.`,
    ],
    cta: { label: 'View leaderboard', url: data.ctaUrl },
    footer: FOOTER,
  };
}

export interface ProjectCompletionSummaryMailData {
  recipientFirstName: string;
  projectNames: string[];
  periodLabel: string;
  ctaUrl: string;
}

export function projectCompletionSummaryMail(
  data: ProjectCompletionSummaryMailData,
): MailTemplateInput {
  return {
    subject: `${data.projectNames.length} project(s) completed this period`,
    preheader: `Project completion summary for ${data.periodLabel}.`,
    bodyParagraphs: [
      `Hi ${data.recipientFirstName},`,
      `${data.projectNames.length} project(s) completed during ${data.periodLabel}:`,
    ],
    list: data.projectNames.map((name) => ({ label: name })),
    cta: { label: 'View projects', url: data.ctaUrl },
    footer: FOOTER,
  };
}

export interface TeamAiReportMailData {
  recipientFirstName: string;
  teamName: string;
  analysisRunNumber?: number;
  ctaUrl: string;
}

export function teamAiReportMail(
  data: TeamAiReportMailData,
): MailTemplateInput {
  return {
    subject: `AI analysis report — ${data.teamName}`,
    preheader: `The team AI-analysis report for "${data.teamName}" is attached as a PDF.`,
    bodyParagraphs: [
      `Hi ${data.recipientFirstName},`,
      `The AI-analysis report for "${data.teamName}" is ready and attached to this email as a PDF.`,
      ...(data.analysisRunNumber
        ? [`It snapshots analysis run #${data.analysisRunNumber}.`]
        : []),
    ],
    cta: { label: 'View team reports', url: data.ctaUrl },
    footer: FOOTER,
  };
}

export interface IndividualAiReportMailData {
  recipientFirstName: string;
  developerName: string;
  /** true when this copy is going to the developer's team lead, not the developer themselves. */
  forTeamLead: boolean;
  analysisRunNumber?: number;
  ctaUrl: string;
}

export function individualAiReportMail(
  data: IndividualAiReportMailData,
): MailTemplateInput {
  const subject = data.forTeamLead
    ? `AI analysis report — ${data.developerName}`
    : 'Your AI analysis report is ready';
  const intro = data.forTeamLead
    ? `The AI-analysis report for your team member "${data.developerName}" is ready and attached to this email as a PDF.`
    : 'Your individual AI-analysis report is ready and attached to this email as a PDF.';
  return {
    subject,
    preheader: data.forTeamLead
      ? `${data.developerName}'s AI-analysis report is attached as a PDF.`
      : 'Your AI-analysis report is attached as a PDF.',
    bodyParagraphs: [
      `Hi ${data.recipientFirstName},`,
      intro,
      ...(data.analysisRunNumber
        ? [`It snapshots analysis run #${data.analysisRunNumber}.`]
        : []),
      // devlytics.md §7 — this report is only ever copied to the developer
      // and their team lead, never to peer developers.
      'This report is shared only with you and your team lead — it is never visible to peer developers.',
    ],
    cta: { label: 'View reports', url: data.ctaUrl },
    footer: FOOTER,
  };
}

// ---------------------------------------------------------------------------
// Milestone (3)
// ---------------------------------------------------------------------------

export interface RankChangeMailData {
  recipientFirstName: string;
  newRank: number;
  previousRank: number;
  rankDelta: number;
  ctaUrl: string;
}

export function rankChangeMail(data: RankChangeMailData): MailTemplateInput {
  const movedUp = data.rankDelta > 0;
  return {
    subject: movedUp
      ? `You moved up to #${data.newRank}`
      : `You moved to #${data.newRank}`,
    preheader: movedUp
      ? `You climbed ${data.rankDelta} place(s) on the leaderboard.`
      : `You dropped ${Math.abs(data.rankDelta)} place(s) on the leaderboard.`,
    bodyParagraphs: [
      `Hi ${data.recipientFirstName},`,
      movedUp
        ? `You climbed ${data.rankDelta} place(s) on the leaderboard, from #${data.previousRank} to #${data.newRank}.`
        : `You dropped ${Math.abs(data.rankDelta)} place(s) on the leaderboard, from #${data.previousRank} to #${data.newRank}.`,
    ],
    metricRows: [
      { label: 'Previous rank', value: `#${data.previousRank}` },
      {
        label: 'New rank',
        value: `#${data.newRank}`,
        delta: movedUp ? `+${data.rankDelta}` : `${data.rankDelta}`,
      },
    ],
    cta: { label: 'View leaderboard', url: data.ctaUrl },
    footer: FOOTER,
  };
}

export interface AchievementEarnedMailData {
  recipientFirstName: string;
  achievementName: string;
  achievementDescription: string;
  evidence?: string;
  ctaUrl: string;
}

export function achievementEarnedMail(
  data: AchievementEarnedMailData,
): MailTemplateInput {
  return {
    subject: `Achievement earned: ${data.achievementName}`,
    preheader: data.achievementDescription,
    bodyParagraphs: [
      `Hi ${data.recipientFirstName},`,
      `You earned the "${data.achievementName}" achievement: ${data.achievementDescription}`,
      ...(data.evidence ? [`Evidence: ${data.evidence}`] : []),
    ],
    cta: { label: 'View achievements', url: data.ctaUrl },
    footer: FOOTER,
  };
}

export interface GoalCompletedMailData {
  recipientFirstName: string;
  goalTitle: string;
  measuredValue: number;
  targetValue: number;
  ctaUrl: string;
}

export function goalCompletedMail(
  data: GoalCompletedMailData,
): MailTemplateInput {
  return {
    subject: `Goal completed: ${data.goalTitle}`,
    preheader: `Re-analysis confirmed the target was reached (${data.measuredValue}).`,
    bodyParagraphs: [
      `Hi ${data.recipientFirstName},`,
      `Your improvement goal "${data.goalTitle}" is complete — a fresh re-analysis confirmed the target was reached.`,
    ],
    metricRows: [
      { label: 'Measured', value: String(data.measuredValue) },
      { label: 'Target', value: String(data.targetValue) },
    ],
    cta: { label: 'View goal', url: data.ctaUrl },
    footer: FOOTER,
  };
}

// ---------------------------------------------------------------------------
// Alert (2)
// ---------------------------------------------------------------------------

export interface SyncFailureMailData {
  repositoryName: string;
  consecutiveFailures: number;
  lastErrorMessage: string;
  ctaUrl: string;
}

export function syncFailureMail(data: SyncFailureMailData): MailTemplateInput {
  return {
    subject: `Sync failing for ${data.repositoryName}`,
    preheader: `${data.consecutiveFailures} consecutive sync failures.`,
    bodyParagraphs: [
      `"${data.repositoryName}" has failed to sync ${data.consecutiveFailures} times in a row.`,
      `Last error: ${data.lastErrorMessage}`,
    ],
    cta: { label: 'View repository', url: data.ctaUrl },
    footer: FOOTER,
  };
}

export interface ScoringRulesChangedMailData {
  weightVersion: number;
  reason?: string;
  before: { category: string; weightPercent: number }[];
  after: { category: string; weightPercent: number }[];
  ctaUrl: string;
}

export function scoringRulesChangedMail(
  data: ScoringRulesChangedMailData,
): MailTemplateInput {
  const afterByCategory = new Map(
    data.after.map((entry) => [entry.category, entry.weightPercent]),
  );

  return {
    subject: `Scoring weights updated to version ${data.weightVersion}`,
    preheader: data.reason ?? 'Scoring category weights were changed.',
    bodyParagraphs: [
      `Scoring category weights were changed to version ${data.weightVersion}.`,
      data.reason ? `Reason: ${data.reason}` : 'No reason was provided.',
    ],
    list: data.before.map((entry) => ({
      label: entry.category,
      detail: `${entry.weightPercent}% → ${afterByCategory.get(entry.category) ?? entry.weightPercent}%`,
    })),
    cta: { label: 'View scoring rules', url: data.ctaUrl },
    footer: FOOTER,
  };
}
