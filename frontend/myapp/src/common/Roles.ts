/**
 * Mirrors backend `RoleKey` enum (prisma/schema.prisma) — the fixed set of
 * role keys every organization is provisioned with.
 */
export const Roles = {
  ORGANIZATION_ADMIN: 'ORGANIZATION_ADMIN',
  DEPARTMENT_MANAGER: 'DEPARTMENT_MANAGER',
  TEAM_LEAD: 'TEAM_LEAD',
  DEVELOPER: 'DEVELOPER',
  AUDITOR: 'AUDITOR',
  BILLING: 'BILLING',
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];
