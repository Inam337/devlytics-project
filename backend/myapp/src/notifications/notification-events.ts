import { NotificationCategory } from '@prisma/client';

/**
 * The sixteen notification events from docs/devlytics.md §8. In-app
 * notifications and email templates share this event set.
 */
export const NotificationEvent = {
  ORGANIZATION_CREATED: 'organization_created',
  DEVELOPER_INVITATION: 'developer_invitation',
  PASSWORD_RESET: 'password_reset',
  ADDED_TO_TEAM: 'added_to_team',
  ASSIGNED_TO_PROJECT: 'assigned_to_project',

  ANALYSIS_RUN_COMPLETE: 'analysis_run_complete',
  WEEKLY_DEVELOPER_SUMMARY: 'weekly_developer_summary',
  TEAM_LEADERBOARD_DIGEST: 'team_leaderboard_digest',
  PROJECT_COMPLETION_SUMMARY: 'project_completion_summary',
  AI_REPORT_TEAM: 'ai_report_team',
  AI_REPORT_INDIVIDUAL: 'ai_report_individual',

  RANK_CHANGE: 'rank_change',
  ACHIEVEMENT_EARNED: 'achievement_earned',
  GOAL_COMPLETED: 'goal_completed',

  SYNC_FAILURE: 'sync_failure',
  SCORING_RULES_CHANGED: 'scoring_rules_changed',
} as const;

export type NotificationEventKey = (typeof NotificationEvent)[keyof typeof NotificationEvent];

export const NOTIFICATION_CATEGORY: Record<NotificationEventKey, NotificationCategory> = {
  [NotificationEvent.ORGANIZATION_CREATED]: 'TRANSACTIONAL',
  [NotificationEvent.DEVELOPER_INVITATION]: 'TRANSACTIONAL',
  [NotificationEvent.PASSWORD_RESET]: 'TRANSACTIONAL',
  [NotificationEvent.ADDED_TO_TEAM]: 'TRANSACTIONAL',
  [NotificationEvent.ASSIGNED_TO_PROJECT]: 'TRANSACTIONAL',

  [NotificationEvent.ANALYSIS_RUN_COMPLETE]: 'DIGEST',
  [NotificationEvent.WEEKLY_DEVELOPER_SUMMARY]: 'DIGEST',
  [NotificationEvent.TEAM_LEADERBOARD_DIGEST]: 'DIGEST',
  [NotificationEvent.PROJECT_COMPLETION_SUMMARY]: 'DIGEST',
  [NotificationEvent.AI_REPORT_TEAM]: 'DIGEST',
  [NotificationEvent.AI_REPORT_INDIVIDUAL]: 'DIGEST',

  [NotificationEvent.RANK_CHANGE]: 'MILESTONE',
  [NotificationEvent.ACHIEVEMENT_EARNED]: 'MILESTONE',
  [NotificationEvent.GOAL_COMPLETED]: 'MILESTONE',

  [NotificationEvent.SYNC_FAILURE]: 'ALERT',
  [NotificationEvent.SCORING_RULES_CHANGED]: 'ALERT',
};

/** Rank changes are only worth telling someone about when they move 2+ places. */
export const RANK_CHANGE_THRESHOLD = 2;

/** A provider is only reported as failing after two consecutive failures. */
export const SYNC_FAILURE_THRESHOLD = 2;
