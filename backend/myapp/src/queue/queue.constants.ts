/**
 * BullMQ queue names. Long-running Git, quality, AI and reporting work is
 * enqueued here instead of running inside an HTTP request.
 */
export const QUEUE = {
  GIT_SYNC: 'git-sync',
  WEBHOOK_PROCESSING: 'webhook-processing',
  METRICS_CALCULATION: 'metrics-calculation',
  QUALITY_ANALYSIS: 'quality-analysis',
  AI_ANALYSIS: 'ai-analysis',
  RANKING_CALCULATION: 'ranking-calculation',
  IMPROVEMENT_PROGRESS: 'improvement-progress',
  REPORT_GENERATION: 'report-generation',
  NOTIFICATIONS: 'notifications',
} as const;

export type QueueName = (typeof QUEUE)[keyof typeof QUEUE];

export const ALL_QUEUES: QueueName[] = Object.values(QUEUE);

/**
 * Every job carries the organization it belongs to, so background work enforces
 * the same tenant boundary as an HTTP request.
 */
export interface BaseJobData {
  organizationId: string;
  requestedBy?: string;
  repositoryId?: string;
  syncJobId?: string;
}
