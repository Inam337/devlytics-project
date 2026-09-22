import { RoleKey } from '@prisma/client';

/**
 * Permission catalog. Keys are `<resource>:<action>` and are seeded into
 * tbl_permission; the role → permission mapping below is seeded into
 * tbl_role_permission for every organization.
 *
 * Scopes mirror docs/devlytics.md §2.2.
 */
export const Permission = {
  ORGANIZATION_READ: 'organization:read',
  ORGANIZATION_UPDATE: 'organization:update',

  USER_READ: 'user:read',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',

  ROLE_READ: 'role:read',
  ROLE_UPDATE: 'role:update',

  DEPARTMENT_READ: 'department:read',
  DEPARTMENT_WRITE: 'department:write',

  TEAM_READ: 'team:read',
  TEAM_WRITE: 'team:write',

  PROJECT_READ: 'project:read',
  PROJECT_WRITE: 'project:write',

  REPOSITORY_READ: 'repository:read',
  REPOSITORY_WRITE: 'repository:write',
  REPOSITORY_SYNC: 'repository:sync',

  INTEGRATION_READ: 'integration:read',
  INTEGRATION_WRITE: 'integration:write',

  ACTIVITY_READ: 'activity:read',
  METRIC_READ: 'metric:read',

  QUALITY_READ: 'quality:read',
  QUALITY_WRITE: 'quality:write',

  SCORING_READ: 'scoring:read',
  SCORING_WRITE: 'scoring:write',

  RANKING_READ: 'ranking:read',

  AI_READ: 'ai:read',
  AI_WRITE: 'ai:write',
  AI_RUN: 'ai:run',

  IMPROVEMENT_READ: 'improvement:read',
  IMPROVEMENT_WRITE: 'improvement:write',

  SELF_EVALUATION_READ: 'self_evaluation:read',
  SELF_EVALUATION_WRITE: 'self_evaluation:write',

  GOAL_READ: 'goal:read',
  GOAL_WRITE: 'goal:write',

  ACHIEVEMENT_READ: 'achievement:read',
  NOTIFICATION_READ: 'notification:read',
  REPORT_READ: 'report:read',
  DASHBOARD_READ: 'dashboard:read',

  AUDIT_READ: 'audit:read',
  SYNC_READ: 'sync:read',
  SYNC_WRITE: 'sync:write',

  BILLING_READ: 'billing:read',
  BILLING_WRITE: 'billing:write',
} as const;

export type PermissionKey = (typeof Permission)[keyof typeof Permission];

export const ALL_PERMISSIONS: PermissionKey[] = Object.values(Permission);

const READ_ONLY_PERMISSIONS: PermissionKey[] = ALL_PERMISSIONS.filter((key) =>
  key.endsWith(':read'),
);

/** Everything a developer may do on their own records plus read-only leaderboards. */
const DEVELOPER_PERMISSIONS: PermissionKey[] = [
  Permission.ORGANIZATION_READ,
  Permission.USER_READ,
  Permission.TEAM_READ,
  Permission.PROJECT_READ,
  Permission.REPOSITORY_READ,
  Permission.ACTIVITY_READ,
  Permission.METRIC_READ,
  Permission.QUALITY_READ,
  Permission.SCORING_READ,
  Permission.RANKING_READ,
  Permission.AI_READ,
  Permission.IMPROVEMENT_READ,
  Permission.SELF_EVALUATION_READ,
  Permission.SELF_EVALUATION_WRITE,
  Permission.GOAL_READ,
  Permission.GOAL_WRITE,
  Permission.ACHIEVEMENT_READ,
  Permission.NOTIFICATION_READ,
  Permission.DASHBOARD_READ,
  Permission.REPORT_READ,
];

const TEAM_LEAD_PERMISSIONS: PermissionKey[] = [
  ...DEVELOPER_PERMISSIONS,
  Permission.TEAM_WRITE,
  Permission.PROJECT_WRITE,
  Permission.REPOSITORY_WRITE,
  Permission.REPOSITORY_SYNC,
  Permission.QUALITY_WRITE,
  Permission.IMPROVEMENT_WRITE,
  Permission.AI_RUN,
  Permission.INTEGRATION_READ,
  Permission.SYNC_READ,
];

const DEPARTMENT_MANAGER_PERMISSIONS: PermissionKey[] = [
  ...TEAM_LEAD_PERMISSIONS,
  Permission.DEPARTMENT_READ,
  Permission.DEPARTMENT_WRITE,
  Permission.USER_CREATE,
  Permission.USER_UPDATE,
  Permission.SYNC_WRITE,
];

export const ROLE_PERMISSIONS: Record<RoleKey, PermissionKey[]> = {
  ORGANIZATION_ADMIN: ALL_PERMISSIONS,
  DEPARTMENT_MANAGER: unique(DEPARTMENT_MANAGER_PERMISSIONS),
  TEAM_LEAD: unique(TEAM_LEAD_PERMISSIONS),
  DEVELOPER: unique(DEVELOPER_PERMISSIONS),
  AUDITOR: unique([...READ_ONLY_PERMISSIONS]),
  BILLING: [
    Permission.ORGANIZATION_READ,
    Permission.BILLING_READ,
    Permission.BILLING_WRITE,
  ],
};

export const ROLE_DEFINITIONS: {
  key: RoleKey;
  name: string;
  description: string;
}[] = [
  {
    key: 'ORGANIZATION_ADMIN',
    name: 'Organization Admin',
    description:
      'Everything, including scoring weights, integrations, security and audit',
  },
  {
    key: 'DEPARTMENT_MANAGER',
    name: 'Department Manager',
    description:
      'All teams within their department; read-only on organization settings',
  },
  {
    key: 'TEAM_LEAD',
    name: 'Team Lead',
    description: "Their team's members, projects, repositories and goals",
  },
  {
    key: 'DEVELOPER',
    name: 'Developer',
    description: 'Own profile, own findings and goals; read-only leaderboards',
  },
  {
    key: 'AUDITOR',
    name: 'Auditor',
    description: 'Read-only across the organization, including audit logs',
  },
  {
    key: 'BILLING',
    name: 'Billing',
    description: 'Subscription and invoices only',
  },
];

function unique(keys: PermissionKey[]): PermissionKey[] {
  return [...new Set(keys)];
}

export function permissionParts(key: string): {
  resource: string;
  action: string;
} {
  const [resource, action] = key.split(':');
  return { resource, action };
}
