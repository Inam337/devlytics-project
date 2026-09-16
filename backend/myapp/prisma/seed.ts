/**
 * Devlytics demo seed. Provisions one organization the same way
 * OrganizationsService.provision() does (roles, permission grants, default
 * scoring weights, local AI provider) and then layers on realistic
 * engineering activity — repos, commits, PRs, reviews, quality analysis,
 * scores, goals, achievements — so the frontend has something to render
 * against a clean database.
 *
 * Run with `npm run db:seed`. Safe to re-run: the demo organization is deleted
 * (cascading through every org-scoped table — roles, repos, commits, scores,
 * goals, etc.) and rebuilt from scratch each time. Users are upserted by email
 * so their ids stay stable across runs; the permission and achievement
 * catalogs are global and are upserted, never deleted.
 */
import { randomBytes } from 'node:crypto';
import {
  AchievementStatus,
  AnalysisRunStatus,
  AnalysisScope,
  AuditCategory,
  DeploymentStatus,
  EffortLevel,
  ExperimentConfidence,
  ExperimentStatus,
  GitIdentityClassification,
  GitProviderType,
  GoalDirection,
  GoalOwnerType,
  GoalStatus,
  ImpactLevel,
  IssueSeverity,
  IssueStatus,
  MaintainabilityRating,
  MembershipStatus,
  MetricDirection,
  MetricType,
  NotificationCategory,
  NotificationChannel,
  PipelineStatus,
  PrismaClient,
  ProjectStatus,
  ProviderStatus,
  PullRequestStatus,
  QualityCategory,
  QualityIssueStatus,
  RankingPeriod,
  RankingSubjectType,
  RecommendationStatus,
  RepositoryVisibility,
  ReviewState,
  RoleKey,
  ScoreCategory,
  ScoreFreshness,
  SelfEvaluationStatus,
  SyncJobStatus,
  SyncJobType,
  SyncStatus,
  UserStatus,
  VerificationStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  ALL_PERMISSIONS,
  permissionParts,
  ROLE_DEFINITIONS,
  ROLE_PERMISSIONS,
} from '../src/common/constants/permissions';
import { DEFAULT_SCORING_WEIGHTS, SCORE_CATEGORIES } from '../src/scoring/scoring.constants';
import { ACHIEVEMENT_CATALOG } from '../src/database/reference-data.service';

const prisma = new PrismaClient();

const ORG_SLUG = 'devlytics-demo';
const ORG_NAME = 'Devlytics Demo Org';
const BCRYPT_ROUNDS = 12;
const DEMO_PASSWORD = 'Devlytics123!';

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function pick<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)];
}

function pickMany<T>(items: T[], count: number): T[] {
  const pool = [...items];
  const chosen: T[] = [];
  for (let i = 0; i < count && pool.length > 0; i += 1) {
    chosen.push(pool.splice(randomInt(0, pool.length - 1), 1)[0]);
  }
  return chosen;
}

function daysAgo(days: number, hour = randomInt(8, 19)): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(hour, randomInt(0, 59), 0, 0);
  return date;
}

function dateOnlyDaysAgo(days: number): Date {
  const date = daysAgo(days, 0);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function hexId(bytes = 8): string {
  return randomBytes(bytes).toString('hex');
}

function commitSha(): string {
  return randomBytes(20).toString('hex');
}

function startOfMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function endOfMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
}

function seqFactory(prefix: string): () => string {
  let n = 0;
  return () => {
    n += 1;
    return `${prefix}-${n}`;
  };
}

// ---------------------------------------------------------------------------
// Static demo data
// ---------------------------------------------------------------------------

interface SeedUserDef {
  key: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  employeeCode: string;
  role: RoleKey;
}

const USER_DEFS: SeedUserDef[] = [
  { key: 'admin', firstName: 'Ava', lastName: 'Thompson', email: 'admin@devlytics.dev', jobTitle: 'VP of Engineering', employeeCode: 'EMP-001', role: RoleKey.ORGANIZATION_ADMIN },
  { key: 'manager', firstName: 'Liam', lastName: 'Carter', email: 'liam.carter@devlytics.dev', jobTitle: 'Engineering Director', employeeCode: 'EMP-002', role: RoleKey.DEPARTMENT_MANAGER },
  { key: 'feLead', firstName: 'Sofia', lastName: 'Martins', email: 'sofia.martins@devlytics.dev', jobTitle: 'Frontend Team Lead', employeeCode: 'EMP-003', role: RoleKey.TEAM_LEAD },
  { key: 'beLead', firstName: 'Noah', lastName: 'Becker', email: 'noah.becker@devlytics.dev', jobTitle: 'Backend Team Lead', employeeCode: 'EMP-004', role: RoleKey.TEAM_LEAD },
  { key: 'platLead', firstName: 'Priya', lastName: 'Nair', email: 'priya.nair@devlytics.dev', jobTitle: 'Platform Team Lead', employeeCode: 'EMP-005', role: RoleKey.TEAM_LEAD },
  { key: 'maya', firstName: 'Maya', lastName: 'Patel', email: 'maya.patel@devlytics.dev', jobTitle: 'Senior Frontend Engineer', employeeCode: 'EMP-006', role: RoleKey.DEVELOPER },
  { key: 'ethan', firstName: 'Ethan', lastName: 'Wright', email: 'ethan.wright@devlytics.dev', jobTitle: 'Frontend Engineer', employeeCode: 'EMP-007', role: RoleKey.DEVELOPER },
  { key: 'zara', firstName: 'Zara', lastName: 'Ahmed', email: 'zara.ahmed@devlytics.dev', jobTitle: 'Senior Backend Engineer', employeeCode: 'EMP-008', role: RoleKey.DEVELOPER },
  { key: 'lucas', firstName: 'Lucas', lastName: 'Silva', email: 'lucas.silva@devlytics.dev', jobTitle: 'Backend Engineer', employeeCode: 'EMP-009', role: RoleKey.DEVELOPER },
  { key: 'grace', firstName: 'Grace', lastName: 'Kim', email: 'grace.kim@devlytics.dev', jobTitle: 'Compliance Auditor', employeeCode: 'EMP-010', role: RoleKey.AUDITOR },
];

const QUALITY_CATEGORIES = Object.values(QualityCategory);
const SEVERITIES = Object.values(IssueSeverity);
const EFFORT_LEVELS = Object.values(EffortLevel);
const IMPACT_LEVELS = Object.values(ImpactLevel);

// ---------------------------------------------------------------------------
// Reference data (mirrors ReferenceDataService)
// ---------------------------------------------------------------------------

async function syncPermissions(): Promise<void> {
  await prisma.$transaction(
    ALL_PERMISSIONS.map((key) => {
      const { resource, action } = permissionParts(key);
      return prisma.permission.upsert({
        where: { key },
        update: { resource, action },
        create: { key, resource, action, description: `${action} on ${resource}` },
      });
    }),
  );
}

async function syncAchievements() {
  await prisma.$transaction(
    ACHIEVEMENT_CATALOG.map((achievement) =>
      prisma.achievement.upsert({
        where: { key: achievement.key },
        update: {
          name: achievement.name,
          description: achievement.description,
          category: achievement.category,
          metricKey: achievement.metricKey,
          targetValue: achievement.targetValue,
          points: achievement.points,
          icon: achievement.icon,
        },
        create: achievement,
      }),
    ),
  );
  return prisma.achievement.findMany();
}

// ---------------------------------------------------------------------------
// Organization, roles, scoring, users
// ---------------------------------------------------------------------------

/**
 * Deletes the demo organization if a previous run left one behind. Every
 * org-scoped table cascades from Organization (see schema.prisma), so this is
 * the one step that makes re-running the seed produce a clean result instead
 * of tripping the unique constraints on commits, PRs, issues, etc. Users are
 * untouched — they live outside the organization boundary and are re-linked
 * via OrganizationUser in seedUsers().
 */
async function resetOrganization(): Promise<void> {
  const existing = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (existing) {
    await prisma.organization.delete({ where: { id: existing.id } });
    console.log(`Removed existing '${ORG_SLUG}' organization before reseeding.`);
  }
}

async function seedOrganization() {
  return prisma.organization.create({
    data: {
      name: ORG_NAME,
      slug: ORG_SLUG,
      description: 'Demo tenant seeded for local development and frontend integration.',
      industry: 'Software',
      timezone: 'UTC',
      primaryColor: '#372b73',
      secondaryColor: '#0B7D9E',
      onboardingState: { currentStep: 5, completedSteps: [1, 2, 3, 4, 5], skipped: false },
    },
  });
}

/** Mirrors OrganizationsService.provision() so login/RBAC behave identically. */
async function provisionOrganization(organizationId: string) {
  const permissions = await prisma.permission.findMany();
  const permissionIdByKey = new Map(permissions.map((p) => [p.key, p.id]));

  await prisma.$transaction(async (tx) => {
    for (const definition of ROLE_DEFINITIONS) {
      const role = await tx.role.upsert({
        where: { organizationId_key: { organizationId, key: definition.key } },
        update: { name: definition.name, description: definition.description },
        create: {
          organizationId,
          key: definition.key,
          name: definition.name,
          description: definition.description,
        },
      });

      const grants = ROLE_PERMISSIONS[definition.key]
        .map((key) => permissionIdByKey.get(key))
        .filter((id): id is string => Boolean(id))
        .map((permissionId) => ({ roleId: role.id, permissionId }));

      if (grants.length > 0) {
        await tx.rolePermission.createMany({ data: grants, skipDuplicates: true });
      }
    }

    await tx.scoringRule.createMany({
      data: SCORE_CATEGORIES.map((category) => ({
        organizationId,
        weightVersion: 1,
        category,
        weightPercent: DEFAULT_SCORING_WEIGHTS[category],
        isActive: true,
        reason: 'Initial default weight configuration',
      })),
      skipDuplicates: true,
    });

    await tx.aiProvider.upsert({
      where: { organizationId_providerType: { organizationId, providerType: 'OLLAMA' } },
      update: {},
      create: {
        organizationId,
        providerType: 'OLLAMA',
        name: 'Ollama (local)',
        isLocal: true,
        isEnabled: true,
        defaultModel: process.env.OLLAMA_MODEL ?? 'llama3.1',
        baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
      },
    });
  });
}

async function seedUsers(organizationId: string) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);
  const roles = await prisma.role.findMany({ where: { organizationId } });
  const roleIdByKey = new Map(roles.map((r) => [r.key, r.id]));

  const users: Record<string, { id: string; roleKey: RoleKey }> = {};

  for (const def of USER_DEFS) {
    const user = await prisma.user.upsert({
      where: { email: def.email },
      update: {},
      create: {
        firstName: def.firstName,
        lastName: def.lastName,
        email: def.email,
        passwordHash,
        jobTitle: def.jobTitle,
        employeeCode: def.employeeCode,
        status: UserStatus.ACTIVE,
        lastLoginAt: daysAgo(randomInt(0, 3)),
        lastActiveAt: daysAgo(randomInt(0, 1)),
      },
    });

    const roleId = roleIdByKey.get(def.role);
    if (!roleId) throw new Error(`Role ${def.role} was not provisioned`);

    await prisma.organizationUser.upsert({
      where: { organizationId_userId: { organizationId, userId: user.id } },
      update: { roleId, status: MembershipStatus.ACTIVE },
      create: {
        organizationId,
        userId: user.id,
        roleId,
        status: MembershipStatus.ACTIVE,
        invitedAt: daysAgo(180),
        joinedAt: daysAgo(179),
      },
    });

    users[def.key] = { id: user.id, roleKey: def.role };
  }

  return users;
}

// ---------------------------------------------------------------------------
// Org structure: departments, teams, projects
// ---------------------------------------------------------------------------

async function seedOrgStructure(organizationId: string, users: Record<string, { id: string }>) {
  const engineering = await prisma.department.upsert({
    where: { organizationId_code: { organizationId, code: 'ENG' } },
    update: {},
    create: {
      organizationId,
      name: 'Engineering',
      code: 'ENG',
      description: 'Product engineering: frontend, backend and platform.',
      managerId: users.manager.id,
    },
  });

  const platform = await prisma.department.upsert({
    where: { organizationId_code: { organizationId, code: 'PLT' } },
    update: {},
    create: {
      organizationId,
      name: 'Platform',
      code: 'PLT',
      description: 'Infrastructure, tooling and developer experience.',
      managerId: users.manager.id,
    },
  });

  const teamDefs = [
    { code: 'FE', name: 'Frontend Guild', color: '#372b73', deptId: engineering.id, leadKey: 'feLead', memberKeys: ['feLead', 'maya', 'ethan'] },
    { code: 'BE', name: 'Backend Core', color: '#0B7D9E', deptId: engineering.id, leadKey: 'beLead', memberKeys: ['beLead', 'zara', 'lucas'] },
    { code: 'PLAT', name: 'Platform Infra', color: '#B5651D', deptId: platform.id, leadKey: 'platLead', memberKeys: ['platLead', 'zara'] },
  ] as const;

  const teams: Record<string, { id: string; name: string; memberKeys: readonly string[] }> = {};

  for (const def of teamDefs) {
    const team = await prisma.team.upsert({
      where: { organizationId_code: { organizationId, code: def.code } },
      update: {},
      create: {
        organizationId,
        departmentId: def.deptId,
        name: def.name,
        code: def.code,
        description: `${def.name} team`,
        teamColor: def.color,
        teamLeadId: users[def.leadKey].id,
        status: 'ACTIVE',
      },
    });

    for (const memberKey of def.memberKeys) {
      await prisma.teamMember.upsert({
        where: { teamId_userId: { teamId: team.id, userId: users[memberKey].id } },
        update: {},
        create: {
          organizationId,
          teamId: team.id,
          userId: users[memberKey].id,
          isLead: memberKey === def.leadKey,
          positionTitle: memberKey === def.leadKey ? 'Team Lead' : undefined,
          joinedAt: daysAgo(150),
        },
      });
    }

    teams[def.code] = { id: team.id, name: def.name, memberKeys: def.memberKeys };
  }

  return { departments: { engineering, platform }, teams };
}

async function seedProjects(
  organizationId: string,
  users: Record<string, { id: string }>,
  teams: Record<string, { id: string }>,
) {
  const projectDefs = [
    { code: 'CP', name: 'Customer Portal', status: ProjectStatus.ACTIVE, progress: 65, ownerKey: 'admin', teamCodes: [['FE', true], ['BE', false]] as const },
    { code: 'AP', name: 'Analytics Pipeline', status: ProjectStatus.AT_RISK, progress: 40, ownerKey: 'manager', teamCodes: [['BE', true], ['PLAT', false]] as const },
    { code: 'IT', name: 'Internal Tooling', status: ProjectStatus.COMPLETED, progress: 100, ownerKey: 'beLead', teamCodes: [['PLAT', true]] as const },
  ];

  const projects: Record<string, { id: string; name: string }> = {};

  for (const def of projectDefs) {
    const project = await prisma.project.upsert({
      where: { organizationId_code: { organizationId, code: def.code } },
      update: {},
      create: {
        organizationId,
        name: def.name,
        code: def.code,
        projectKey: def.code,
        description: `${def.name} — seeded demo project`,
        status: def.status,
        progressPercent: def.progress,
        startDate: daysAgo(120),
        endDate: def.status === ProjectStatus.COMPLETED ? daysAgo(5) : null,
        ownerId: users[def.ownerKey].id,
      },
    });

    for (const [teamCode, isPrimary] of def.teamCodes) {
      await prisma.projectTeam.upsert({
        where: { projectId_teamId: { projectId: project.id, teamId: teams[teamCode].id } },
        update: {},
        create: { organizationId, projectId: project.id, teamId: teams[teamCode].id, isPrimary },
      });
    }

    projects[def.code] = { id: project.id, name: def.name };
  }

  return projects;
}

// ---------------------------------------------------------------------------
// Git integration
// ---------------------------------------------------------------------------

async function seedGitProvider(organizationId: string, adminUserId: string) {
  return prisma.gitProvider.upsert({
    where: {
      organizationId_providerType_externalAccountId: {
        organizationId,
        providerType: GitProviderType.GITHUB,
        externalAccountId: 'devlytics-demo-org',
      },
    },
    update: {},
    create: {
      organizationId,
      providerType: GitProviderType.GITHUB,
      displayName: 'Devlytics GitHub',
      baseUrl: 'https://api.github.com',
      externalAccountId: 'devlytics-demo-org',
      externalAccountName: 'devlytics-demo',
      scopes: ['repo:read', 'org:read', 'actions:read'],
      status: ProviderStatus.CONNECTED,
      lastSyncAt: daysAgo(0),
      connectedById: adminUserId,
    },
  });
}

async function seedGitAccounts(
  organizationId: string,
  providerId: string,
  users: Record<string, { id: string }>,
) {
  const accounts: Record<string, string> = {};

  for (const def of USER_DEFS) {
    const username = `${def.firstName}.${def.lastName}`.toLowerCase();
    const account = await prisma.gitAccount.upsert({
      where: { providerId_username: { providerId, username } },
      update: {},
      create: {
        organizationId,
        providerId,
        userId: users[def.key].id,
        externalUserId: hexId(4),
        username,
        commitEmail: def.email,
        classification: GitIdentityClassification.MATCHED,
        matchedAt: daysAgo(150),
      },
    });
    accounts[def.key] = account.id;
  }

  const bot = await prisma.gitAccount.upsert({
    where: { providerId_username: { providerId, username: 'dependabot[bot]' } },
    update: {},
    create: {
      organizationId,
      providerId,
      username: 'dependabot[bot]',
      classification: GitIdentityClassification.BOT,
      isBot: true,
    },
  });
  accounts.bot = bot.id;

  return accounts;
}

// ---------------------------------------------------------------------------
// Repositories and activity
// ---------------------------------------------------------------------------

interface RepoDef {
  code: string;
  name: string;
  language: string;
  teamCode: string;
  projectCode: string;
  memberKeys: string[];
}

const REPO_DEFS: RepoDef[] = [
  { code: '1001', name: 'customer-portal-web', language: 'TypeScript', teamCode: 'FE', projectCode: 'CP', memberKeys: ['feLead', 'maya', 'ethan'] },
  { code: '1002', name: 'customer-portal-api', language: 'Go', teamCode: 'BE', projectCode: 'CP', memberKeys: ['beLead', 'zara', 'lucas'] },
  { code: '1003', name: 'analytics-pipeline', language: 'Python', teamCode: 'PLAT', projectCode: 'AP', memberKeys: ['platLead', 'zara'] },
];

async function seedRepositories(
  organizationId: string,
  providerId: string,
  projects: Record<string, { id: string }>,
  teams: Record<string, { id: string }>,
) {
  const repositories: Record<string, { id: string; name: string; memberKeys: string[] }> = {};

  for (const def of REPO_DEFS) {
    const repo = await prisma.repository.upsert({
      where: { providerId_externalRepositoryId: { providerId, externalRepositoryId: def.code } },
      update: {},
      create: {
        organizationId,
        providerId,
        projectId: projects[def.projectCode].id,
        teamId: teams[def.teamCode].id,
        externalRepositoryId: def.code,
        name: def.name,
        fullName: `devlytics-demo/${def.name}`,
        url: `https://github.com/devlytics-demo/${def.name}`,
        cloneUrl: `https://github.com/devlytics-demo/${def.name}.git`,
        language: def.language,
        visibility: RepositoryVisibility.PRIVATE,
        syncStatus: SyncStatus.SYNCED,
        lastSyncAt: daysAgo(0),
      },
    });
    repositories[def.code] = { id: repo.id, name: def.name, memberKeys: def.memberKeys };
  }

  return repositories;
}

async function seedRepositoryMembers(
  organizationId: string,
  repositories: Record<string, { id: string; memberKeys: string[] }>,
  users: Record<string, { id: string }>,
) {
  for (const repo of Object.values(repositories)) {
    for (const memberKey of repo.memberKeys) {
      await prisma.repositoryMember.upsert({
        where: { repositoryId_userId: { repositoryId: repo.id, userId: users[memberKey].id } },
        update: {},
        create: {
          organizationId,
          repositoryId: repo.id,
          userId: users[memberKey].id,
          accessLevel: 'write',
          contributions: randomInt(20, 200),
        },
      });
    }
  }
}

const PR_TITLES = [
  'Add pagination to results table',
  'Fix race condition in webhook handler',
  'Refactor auth middleware for clarity',
  'Improve error messages on validation failure',
  'Add caching layer for dashboard queries',
  'Upgrade dependencies and fix breakages',
  'Add integration tests for sync flow',
  'Optimise N+1 query in scoring service',
];

const ISSUE_TITLES = [
  'Dashboard chart flickers on resize',
  'Sync job stalls on large repositories',
  'Incorrect timezone on activity timestamps',
  'Memory leak in long-running worker',
  'Rate limit not respected on GitHub API calls',
  'Missing validation on webhook payload',
];

async function seedActivity(
  organizationId: string,
  repositories: Record<string, { id: string; memberKeys: string[] }>,
  users: Record<string, { id: string }>,
  gitAccounts: Record<string, string>,
) {
  const developerMetricSeeds: { userId: string; date: Date }[] = [];

  for (const repo of Object.values(repositories)) {
    const nextCommitId = seqFactory('commit');
    const nextPrId = seqFactory('pr');
    const nextReviewId = seqFactory('review');
    const nextIssueId = seqFactory('issue');
    const nextPipelineId = seqFactory('pipeline');
    const nextDeploymentId = seqFactory('deployment');

    // Commits + files
    for (let i = 0; i < 18; i += 1) {
      const isBotCommit = i % 9 === 0;
      const authorKey = isBotCommit ? null : pick(repo.memberKeys);
      const committedAt = daysAgo(randomInt(0, 60));
      const additions = randomInt(5, 300);
      const deletions = randomInt(0, 150);

      const commit = await prisma.commit.create({
        data: {
          organizationId,
          repositoryId: repo.id,
          authorId: authorKey ? users[authorKey].id : null,
          gitAccountId: isBotCommit ? gitAccounts.bot : gitAccounts[authorKey!],
          externalCommitId: nextCommitId(),
          commitHash: commitSha(),
          message: isBotCommit ? 'chore: bump dependencies' : pick(PR_TITLES),
          branchName: i % 5 === 0 ? 'main' : `feature/${hexId(3)}`,
          committedAt,
          additions,
          deletions,
          changedFiles: randomInt(1, 8),
          isBot: isBotCommit,
        },
      });

      const fileCount = randomInt(1, 3);
      for (let f = 0; f < fileCount; f += 1) {
        const isTest = f === fileCount - 1 && Math.random() < 0.3;
        await prisma.commitFile.create({
          data: {
            commitId: commit.id,
            filePath: isTest
              ? `test/${hexId(2)}.spec.ts`
              : `src/${hexId(2)}/${hexId(2)}.ts`,
            changeType: pick(['ADDED', 'MODIFIED', 'DELETED']),
            additions: randomInt(1, 100),
            deletions: randomInt(0, 50),
            language: 'TypeScript',
            isTestFile: isTest,
            isDocFile: !isTest && Math.random() < 0.1,
          },
        });
      }

      if (authorKey) developerMetricSeeds.push({ userId: users[authorKey].id, date: committedAt });
    }

    // Pull requests + reviews
    for (let i = 1; i <= 6; i += 1) {
      const authorKey = pick(repo.memberKeys);
      const status = pick<PullRequestStatus>([
        PullRequestStatus.MERGED,
        PullRequestStatus.MERGED,
        PullRequestStatus.MERGED,
        PullRequestStatus.OPEN,
        PullRequestStatus.CLOSED,
      ]);
      const createdAtExternal = daysAgo(randomInt(1, 45));
      const mergedAt = status === PullRequestStatus.MERGED ? daysAgo(randomInt(0, 30)) : null;

      const pr = await prisma.pullRequest.create({
        data: {
          organizationId,
          repositoryId: repo.id,
          authorId: users[authorKey].id,
          externalPrId: nextPrId(),
          number: i,
          title: pick(PR_TITLES),
          description: 'Seeded demo pull request.',
          sourceBranch: `feature/${hexId(3)}`,
          targetBranch: 'main',
          status,
          createdAtExternal,
          mergedAt,
          closedAt: status === PullRequestStatus.CLOSED ? daysAgo(randomInt(0, 10)) : mergedAt,
          firstReviewAt: daysAgo(randomInt(0, 20)),
          additions: randomInt(20, 500),
          deletions: randomInt(0, 200),
          changedFiles: randomInt(1, 12),
          commentCount: randomInt(0, 10),
          reviewCount: randomInt(1, 3),
        },
      });

      const reviewerPool = repo.memberKeys.filter((k) => k !== authorKey);
      const reviewers = pickMany(reviewerPool, Math.min(2, reviewerPool.length));
      for (const reviewerKey of reviewers) {
        await prisma.pullRequestReview.create({
          data: {
            organizationId,
            pullRequestId: pr.id,
            reviewerId: users[reviewerKey].id,
            externalReviewId: nextReviewId(),
            state: pick<ReviewState>([ReviewState.APPROVED, ReviewState.CHANGES_REQUESTED, ReviewState.COMMENTED]),
            body: 'Looks good, left a few comments.',
            commentCount: randomInt(0, 5),
            submittedAt: daysAgo(randomInt(0, 20)),
          },
        });
        developerMetricSeeds.push({ userId: users[reviewerKey].id, date: daysAgo(randomInt(0, 20)) });
      }
    }

    // Issues
    for (let i = 1; i <= 5; i += 1) {
      const creatorKey = pick(repo.memberKeys);
      const assigneeKey = pick(repo.memberKeys);
      const status = Math.random() < 0.6 ? IssueStatus.CLOSED : IssueStatus.OPEN;
      const createdAtExternal = daysAgo(randomInt(5, 90));

      await prisma.issue.create({
        data: {
          organizationId,
          repositoryId: repo.id,
          creatorId: users[creatorKey].id,
          assigneeId: users[assigneeKey].id,
          externalIssueId: nextIssueId(),
          number: i,
          title: pick(ISSUE_TITLES),
          description: 'Seeded demo issue.',
          status,
          labels: pick([['bug'], ['enhancement'], ['bug', 'priority-high'], ['tech-debt']]),
          createdAtExternal,
          closedAt: status === IssueStatus.CLOSED ? daysAgo(randomInt(0, 5)) : null,
        },
      });
    }

    // CI pipelines
    for (let i = 0; i < 8; i += 1) {
      const status = Math.random() < 0.85 ? PipelineStatus.SUCCESS : PipelineStatus.FAILED;
      const startedAt = daysAgo(randomInt(0, 30));
      const durationSeconds = randomInt(60, 900);
      await prisma.ciPipeline.create({
        data: {
          organizationId,
          repositoryId: repo.id,
          externalPipelineId: nextPipelineId(),
          name: 'CI',
          branchName: 'main',
          commitHash: commitSha(),
          status,
          startedAt,
          finishedAt: new Date(startedAt.getTime() + durationSeconds * 1000),
          durationSeconds,
        },
      });
    }

    // Deployments
    for (let i = 0; i < 3; i += 1) {
      const status = i === 2 ? DeploymentStatus.FAILED : DeploymentStatus.SUCCESS;
      await prisma.deployment.create({
        data: {
          organizationId,
          repositoryId: repo.id,
          externalDeploymentId: nextDeploymentId(),
          environment: i === 0 ? 'production' : 'staging',
          status,
          commitHash: commitSha(),
          deployedAt: daysAgo(randomInt(0, 20)),
        },
      });
    }
  }

  return { developerMetricSeeds };
}

// ---------------------------------------------------------------------------
// AI analysis, quality issues, recommendations
// ---------------------------------------------------------------------------

async function seedAiAnalysis(
  organizationId: string,
  repositories: Record<string, { id: string }>,
  projects: Record<string, { id: string }>,
  users: Record<string, { id: string }>,
  aiProviderId: string,
) {
  let runNumber = 0;
  const runs: { id: string; repositoryId: string }[] = [];

  for (const [code, repo] of Object.entries(repositories)) {
    const projectCode = REPO_DEFS.find((r) => r.code === code)!.projectCode;
    for (let i = 0; i < 2; i += 1) {
      runNumber += 1;
      const startedAt = daysAgo(i === 0 ? 12 : 2);
      const run = await prisma.aiAnalysisRun.create({
        data: {
          organizationId,
          providerId: aiProviderId,
          repositoryId: repo.id,
          projectId: projects[projectCode].id,
          requestedById: users.admin.id,
          runNumber,
          scope: AnalysisScope.REPOSITORY,
          status: AnalysisRunStatus.COMPLETED,
          model: 'llama3.1',
          startedAt,
          finishedAt: new Date(startedAt.getTime() + randomInt(30, 180) * 1000),
          durationMs: randomInt(30000, 180000),
          filesAnalyzed: randomInt(50, 400),
          issuesFound: randomInt(2, 8),
          promptTokens: randomInt(2000, 8000),
          completionTokens: randomInt(500, 2000),
          observedFacts: { summary: 'Static analysis completed against the latest default-branch snapshot.' },
        },
      });
      runs.push({ id: run.id, repositoryId: repo.id });
    }
  }

  return runs;
}

const QUALITY_TITLES: Record<string, string> = {
  DUPLICATION: 'Duplicated block detected across modules',
  PERFORMANCE: 'Unbounded query executed in a loop',
  MAINTAINABILITY: 'Function exceeds recommended complexity',
  TESTING: 'Critical path has no test coverage',
  SECURITY: 'User input passed to query without sanitisation',
  RELIABILITY: 'Unhandled promise rejection on error path',
  DOCUMENTATION: 'Public method missing usage documentation',
  TECHNICAL_DEBT: 'TODO left unresolved for over 90 days',
  ARCHITECTURE: 'Module reaches across layer boundary directly',
  COMPLEXITY: 'Cyclomatic complexity above threshold',
};

async function seedQualityIssues(
  organizationId: string,
  runs: { id: string; repositoryId: string }[],
  users: Record<string, { id: string }>,
  teams: Record<string, { id: string }>,
) {
  const issues: { id: string; category: QualityCategory }[] = [];
  const assigneePool = ['maya', 'ethan', 'zara', 'lucas'];

  for (const run of runs) {
    for (let i = 0; i < 4; i += 1) {
      const category = pick(QUALITY_CATEGORIES);
      const severity = pick(SEVERITIES);
      const status = Math.random() < 0.4 ? QualityIssueStatus.RESOLVED : QualityIssueStatus.OPEN;
      const issue = await prisma.codeQualityIssue.create({
        data: {
          organizationId,
          analysisRunId: run.id,
          repositoryId: run.repositoryId,
          assignedUserId: users[pick(assigneePool)].id,
          ruleId: `DEV-${hexId(2).toUpperCase()}`,
          category,
          severity,
          status,
          title: QUALITY_TITLES[category] ?? 'Quality issue detected',
          observedFact: 'Detected via static analysis against the current default branch.',
          aiInference: 'Pattern is consistent with elevated defect risk in this area.',
          aiConfidence: round(randomInt(60, 95) / 100, 2),
          filePath: `src/${hexId(2)}/${hexId(2)}.ts`,
          lineStart: randomInt(1, 400),
          lineEnd: randomInt(400, 500),
          effort: pick(EFFORT_LEVELS),
          impact: pick(IMPACT_LEVELS),
          resolvedAt: status === QualityIssueStatus.RESOLVED ? daysAgo(randomInt(0, 5)) : null,
        },
      });
      issues.push({ id: issue.id, category });
    }
  }

  return issues;
}

async function seedRecommendations(
  organizationId: string,
  runs: { id: string; repositoryId: string }[],
  issues: { id: string; category: QualityCategory }[],
) {
  const recommendations: { id: string; category: QualityCategory }[] = [];
  const sample = pickMany(issues, Math.min(10, issues.length));

  for (const issue of sample) {
    const rec = await prisma.improvementRecommendation.create({
      data: {
        organizationId,
        analysisRunId: pick(runs).id,
        qualityIssueId: issue.id,
        category: issue.category,
        title: `Address ${issue.category.toLowerCase().replace('_', ' ')} finding`,
        recommendation: 'Refactor the affected area and add regression coverage before the next release.',
        rationale: 'Reduces recurrence risk and improves the maintainability score for this module.',
        aiConfidence: round(randomInt(65, 90) / 100, 2),
        effort: pick(EFFORT_LEVELS),
        impact: pick(IMPACT_LEVELS),
        priority: randomInt(1, 5),
        status: pick<RecommendationStatus>([
          RecommendationStatus.PROPOSED,
          RecommendationStatus.ACCEPTED,
          RecommendationStatus.IMPLEMENTED,
        ]),
      },
    });
    recommendations.push({ id: rec.id, category: issue.category });
  }

  return recommendations;
}

async function seedQualitySnapshots(
  organizationId: string,
  repositories: Record<string, { id: string }>,
  projects: Record<string, { id: string }>,
) {
  for (const [code, repo] of Object.entries(repositories)) {
    const projectCode = REPO_DEFS.find((r) => r.code === code)!.projectCode;
    for (let d = 9; d >= 0; d -= 1) {
      const trend = (9 - d) * 0.6; // slight upward trend toward today
      await prisma.codeQualitySnapshot.upsert({
        where: { repositoryId_snapshotDate: { repositoryId: repo.id, snapshotDate: dateOnlyDaysAgo(d) } },
        update: {},
        create: {
          organizationId,
          repositoryId: repo.id,
          projectId: projects[projectCode].id,
          snapshotDate: dateOnlyDaysAgo(d),
          qualityScore: round(68 + trend + randomInt(-2, 2)),
          bugs: randomInt(0, 6),
          vulnerabilities: randomInt(0, 2),
          securityHotspots: randomInt(0, 3),
          codeSmells: randomInt(5, 40),
          coveragePercent: round(60 + trend + randomInt(-3, 3)),
          duplicationPercent: round(Math.max(0, 8 - trend * 0.3)),
          complexity: round(120 + randomInt(-10, 10)),
          maintainabilityScore: round(70 + trend),
          maintainabilityRating: pick<MaintainabilityRating>([MaintainabilityRating.A, MaintainabilityRating.B, MaintainabilityRating.C]),
          technicalDebtMinutes: randomInt(200, 2000),
          locTotal: randomInt(8000, 40000),
        },
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Metrics, scores, rankings
// ---------------------------------------------------------------------------

async function seedMetricsAndScores(
  organizationId: string,
  users: Record<string, { id: string; roleKey: RoleKey }>,
  teams: Record<string, { id: string; memberKeys: readonly string[] }>,
) {
  const devKeys = Object.keys(users);
  const skill: Record<string, number> = {};
  for (const key of devKeys) skill[key] = randomInt(60, 95) / 100;

  for (let d = 9; d >= 0; d -= 1) {
    const date = dateOnlyDaysAgo(d);
    for (const key of devKeys) {
      const factor = skill[key];
      const commits = randomInt(0, Math.round(4 * factor));
      const prsCreated = randomInt(0, 2);
      const prsMerged = randomInt(0, prsCreated);
      const reviewsGiven = randomInt(0, Math.round(3 * factor));

      await prisma.developerDailyMetric.upsert({
        where: { userId_metricDate: { userId: users[key].id, metricDate: date } },
        update: {},
        create: {
          organizationId,
          userId: users[key].id,
          metricDate: date,
          commits,
          prsCreated,
          prsMerged,
          prsReviewed: reviewsGiven,
          reviewsGiven,
          issuesCreated: randomInt(0, 1),
          issuesResolved: randomInt(0, 2),
          locAdded: randomInt(0, 300),
          locRemoved: randomInt(0, 150),
          filesChanged: randomInt(0, 10),
          testsAdded: randomInt(0, 3),
          testsChanged: randomInt(0, 2),
          docsChanged: randomInt(0, 1),
          builds: randomInt(0, 3),
          successfulBuilds: randomInt(0, 3),
          failedBuilds: randomInt(0, 1),
          qualityScore: round(60 + factor * 30),
          deliveryScore: round(55 + factor * 35),
          reviewScore: round(50 + factor * 40),
          testingScore: round(55 + factor * 35),
          reliabilityScore: round(60 + factor * 30),
        },
      });
    }

    for (const team of Object.values(teams)) {
      await prisma.teamDailyMetric.upsert({
        where: { teamId_metricDate: { teamId: team.id, metricDate: date } },
        update: {},
        create: {
          organizationId,
          teamId: team.id,
          metricDate: date,
          activeDevelopers: team.memberKeys.length,
          commits: randomInt(2, 15),
          prsCreated: randomInt(1, 6),
          prsMerged: randomInt(0, 5),
          reviewsGiven: randomInt(1, 8),
          issuesResolved: randomInt(0, 4),
          locAdded: randomInt(50, 800),
          locRemoved: randomInt(20, 400),
          builds: randomInt(1, 8),
          successfulBuilds: randomInt(1, 7),
          failedBuilds: randomInt(0, 2),
          qualityScore: round(65 + randomInt(-5, 15)),
          deliveryScore: round(65 + randomInt(-5, 15)),
          reviewScore: round(65 + randomInt(-5, 15)),
          testingScore: round(65 + randomInt(-5, 15)),
          reliabilityScore: round(65 + randomInt(-5, 15)),
        },
      });
    }
  }

  // Monthly aggregate scores + rankings
  const periodStart = startOfMonth();
  const periodEnd = endOfMonth();
  const devScores: { userId: string; total: number }[] = [];

  for (const key of devKeys) {
    const factor = skill[key];
    const categoryScores: Record<ScoreCategory, number> = {
      CODE_QUALITY: round(60 + factor * 35),
      DELIVERY: round(55 + factor * 40),
      CODE_REVIEW: round(50 + factor * 45),
      TESTING: round(55 + factor * 40),
      RELIABILITY: round(60 + factor * 35),
      COLLABORATION: round(60 + factor * 35),
      DOCUMENTATION: round(55 + factor * 35),
      PROJECT_IMPACT: round(55 + factor * 40),
    };
    const total = round(
      SCORE_CATEGORIES.reduce(
        (sum, category) => sum + (categoryScores[category] * DEFAULT_SCORING_WEIGHTS[category]) / 100,
        0,
      ),
    );

    await prisma.developerScore.upsert({
      where: {
        userId_period_periodStart_weightVersion: {
          userId: users[key].id,
          period: RankingPeriod.MONTHLY,
          periodStart,
          weightVersion: 1,
        },
      },
      update: {},
      create: {
        organizationId,
        userId: users[key].id,
        period: RankingPeriod.MONTHLY,
        periodStart,
        periodEnd,
        weightVersion: 1,
        totalScore: total,
        codeQualityScore: categoryScores.CODE_QUALITY,
        deliveryScore: categoryScores.DELIVERY,
        codeReviewScore: categoryScores.CODE_REVIEW,
        testingScore: categoryScores.TESTING,
        reliabilityScore: categoryScores.RELIABILITY,
        collaborationScore: categoryScores.COLLABORATION,
        documentationScore: categoryScores.DOCUMENTATION,
        projectImpactScore: categoryScores.PROJECT_IMPACT,
        locAdded: randomInt(500, 4000),
        locRemoved: randomInt(200, 2000),
        freshness: ScoreFreshness.LIVE,
      },
    });

    devScores.push({ userId: users[key].id, total });
  }

  devScores.sort((a, b) => b.total - a.total);
  for (let rank = 0; rank < devScores.length; rank += 1) {
    const entry = devScores[rank];
    await prisma.rankingHistory.upsert({
      where: {
        ranking_subject_period_unique: {
          organizationId,
          subjectType: RankingSubjectType.DEVELOPER,
          subjectId: entry.userId,
          period: RankingPeriod.MONTHLY,
          periodStart,
          weightVersion: 1,
        },
      },
      update: {},
      create: {
        organizationId,
        subjectType: RankingSubjectType.DEVELOPER,
        subjectId: entry.userId,
        userId: entry.userId,
        period: RankingPeriod.MONTHLY,
        periodStart,
        periodEnd,
        weightVersion: 1,
        rank: rank + 1,
        previousRank: rank + 1 + pick([-1, 0, 1]),
        rankDelta: pick([-1, 0, 1]),
        score: entry.total,
        totalSubjects: devScores.length,
      },
    });
  }

  const teamScores: { teamId: string; total: number }[] = [];
  for (const team of Object.values(teams)) {
    const categoryScores: Record<ScoreCategory, number> = {
      CODE_QUALITY: round(70 + randomInt(-5, 15)),
      DELIVERY: round(70 + randomInt(-5, 15)),
      CODE_REVIEW: round(70 + randomInt(-5, 15)),
      TESTING: round(70 + randomInt(-5, 15)),
      RELIABILITY: round(70 + randomInt(-5, 15)),
      COLLABORATION: round(70 + randomInt(-5, 15)),
      DOCUMENTATION: round(70 + randomInt(-5, 15)),
      PROJECT_IMPACT: round(70 + randomInt(-5, 15)),
    };
    const total = round(
      SCORE_CATEGORIES.reduce(
        (sum, category) => sum + (categoryScores[category] * DEFAULT_SCORING_WEIGHTS[category]) / 100,
        0,
      ),
    );

    await prisma.teamScore.upsert({
      where: {
        teamId_period_periodStart_weightVersion: {
          teamId: team.id,
          period: RankingPeriod.MONTHLY,
          periodStart,
          weightVersion: 1,
        },
      },
      update: {},
      create: {
        organizationId,
        teamId: team.id,
        period: RankingPeriod.MONTHLY,
        periodStart,
        periodEnd,
        weightVersion: 1,
        totalScore: total,
        codeQualityScore: categoryScores.CODE_QUALITY,
        deliveryScore: categoryScores.DELIVERY,
        codeReviewScore: categoryScores.CODE_REVIEW,
        testingScore: categoryScores.TESTING,
        reliabilityScore: categoryScores.RELIABILITY,
        collaborationScore: categoryScores.COLLABORATION,
        documentationScore: categoryScores.DOCUMENTATION,
        projectImpactScore: categoryScores.PROJECT_IMPACT,
        memberCount: team.memberKeys.length,
        freshness: ScoreFreshness.LIVE,
      },
    });

    teamScores.push({ teamId: team.id, total });
  }

  teamScores.sort((a, b) => b.total - a.total);
  for (let rank = 0; rank < teamScores.length; rank += 1) {
    const entry = teamScores[rank];
    await prisma.rankingHistory.upsert({
      where: {
        ranking_subject_period_unique: {
          organizationId,
          subjectType: RankingSubjectType.TEAM,
          subjectId: entry.teamId,
          period: RankingPeriod.MONTHLY,
          periodStart,
          weightVersion: 1,
        },
      },
      update: {},
      create: {
        organizationId,
        subjectType: RankingSubjectType.TEAM,
        subjectId: entry.teamId,
        teamId: entry.teamId,
        period: RankingPeriod.MONTHLY,
        periodStart,
        periodEnd,
        weightVersion: 1,
        rank: rank + 1,
        previousRank: rank + 1,
        rankDelta: 0,
        score: entry.total,
        totalSubjects: teamScores.length,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// AI integration + usage
// ---------------------------------------------------------------------------

async function seedAiIntegration(organizationId: string, aiProviderId: string) {
  return prisma.aiIntegration.upsert({
    where: { organizationId_name: { organizationId, name: 'Local Llama Analysis' } },
    update: {},
    create: {
      organizationId,
      providerId: aiProviderId,
      name: 'Local Llama Analysis',
      model: 'llama3.1',
      isDefault: true,
      isEnabled: true,
      sanitizeContext: true,
      maxTokens: 4096,
      temperature: 0.2,
    },
  });
}

async function seedAiUsage(
  organizationId: string,
  aiProviderId: string,
  users: Record<string, { id: string }>,
  repositories: Record<string, { id: string }>,
) {
  const repoIds = Object.values(repositories).map((r) => r.id);
  for (let d = 9; d >= 0; d -= 1) {
    await prisma.aiUsage.create({
      data: {
        organizationId,
        providerId: aiProviderId,
        userId: users.admin.id,
        repositoryId: pick(repoIds),
        toolName: 'code-quality-analysis',
        usageDate: dateOnlyDaysAgo(d),
        requestCount: randomInt(1, 6),
        promptTokens: randomInt(1000, 6000),
        completionTokens: randomInt(200, 1500),
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Self-evaluations
// ---------------------------------------------------------------------------

async function seedSelfEvaluations(
  organizationId: string,
  users: Record<string, { id: string; roleKey: RoleKey }>,
  teams: Record<string, { id: string; memberKeys: readonly string[] }>,
) {
  const periodStart = startOfMonth();
  const periodEnd = endOfMonth();
  const reviewerByMember = new Map<string, string>();
  for (const team of Object.values(teams)) {
    const lead = team.memberKeys.find((k) => users[k]?.roleKey === RoleKey.TEAM_LEAD);
    for (const member of team.memberKeys) {
      if (lead && member !== lead) reviewerByMember.set(member, lead);
    }
  }

  for (const key of Object.keys(users)) {
    const status = pick<SelfEvaluationStatus>([
      SelfEvaluationStatus.SUBMITTED,
      SelfEvaluationStatus.SUBMITTED,
      SelfEvaluationStatus.REVIEWED,
      SelfEvaluationStatus.DRAFT,
    ]);
    const reviewerKey = reviewerByMember.get(key) ?? 'manager';

    const evaluation = await prisma.selfEvaluation.upsert({
      where: { userId_period_periodStart: { userId: users[key].id, period: RankingPeriod.MONTHLY, periodStart } },
      update: {},
      create: {
        organizationId,
        userId: users[key].id,
        reviewerId: key === reviewerKey ? undefined : users[reviewerKey]?.id,
        period: RankingPeriod.MONTHLY,
        periodStart,
        periodEnd,
        status,
        summary: 'Focused on delivery throughput and reducing review turnaround this period.',
        overallRating: randomInt(3, 5),
        submittedAt: status !== SelfEvaluationStatus.DRAFT ? daysAgo(3) : null,
        reviewedAt: status === SelfEvaluationStatus.REVIEWED ? daysAgo(1) : null,
        reviewerNotes: status === SelfEvaluationStatus.REVIEWED ? 'Solid progress, keep it up.' : null,
      },
    });

    const categories: ScoreCategory[] = [
      ScoreCategory.CODE_QUALITY,
      ScoreCategory.DELIVERY,
      ScoreCategory.TESTING,
      ScoreCategory.CODE_REVIEW,
    ];
    for (const category of categories) {
      await prisma.selfEvaluationItem.upsert({
        where: { selfEvaluationId_category: { selfEvaluationId: evaluation.id, category } },
        update: {},
        create: {
          selfEvaluationId: evaluation.id,
          category,
          selfRating: randomInt(3, 5),
          measuredScore: round(60 + randomInt(0, 30)),
          comment: 'Consistent with measured activity this period.',
        },
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Improvement goals
// ---------------------------------------------------------------------------

async function seedGoals(
  organizationId: string,
  users: Record<string, { id: string }>,
  teams: Record<string, { id: string }>,
  repositories: Record<string, { id: string }>,
  qualityIssues: { id: string; category: QualityCategory }[],
  recommendations: { id: string; category: QualityCategory }[],
) {
  const repoIds = Object.values(repositories).map((r) => r.id);
  const goalDefs = [
    { ownerType: GoalOwnerType.DEVELOPER, ownerKey: 'maya', metricKey: 'coverage_percent', direction: GoalDirection.INCREASE, baseline: 62, target: 80, current: 71, status: GoalStatus.ACTIVE },
    { ownerType: GoalOwnerType.DEVELOPER, ownerKey: 'zara', metricKey: 'code_smells', direction: GoalDirection.DECREASE, baseline: 40, target: 15, current: 28, status: GoalStatus.ACTIVE },
    { ownerType: GoalOwnerType.DEVELOPER, ownerKey: 'ethan', metricKey: 'review_turnaround_hours', direction: GoalDirection.DECREASE, baseline: 30, target: 12, current: 22, status: GoalStatus.AT_RISK },
    { ownerType: GoalOwnerType.DEVELOPER, ownerKey: 'lucas', metricKey: 'tests_added', direction: GoalDirection.INCREASE, baseline: 5, target: 25, current: 25, status: GoalStatus.COMPLETED },
    { ownerType: GoalOwnerType.TEAM, ownerKey: 'FE', metricKey: 'duplication_percent', direction: GoalDirection.DECREASE, baseline: 9, target: 4, current: 6, status: GoalStatus.ACTIVE },
    { ownerType: GoalOwnerType.TEAM, ownerKey: 'BE', metricKey: 'quality_score', direction: GoalDirection.INCREASE, baseline: 68, target: 85, current: 74, status: GoalStatus.ACTIVE },
  ] as const;

  const goals: { id: string }[] = [];

  for (const def of goalDefs) {
    const qualityIssue = pick(qualityIssues);
    const recommendation = recommendations.find((r) => r.category === qualityIssue.category);

    const goal = await prisma.improvementGoal.create({
      data: {
        organizationId,
        ownerType: def.ownerType,
        ownerUserId: def.ownerType === GoalOwnerType.DEVELOPER ? users[def.ownerKey].id : null,
        ownerTeamId: def.ownerType === GoalOwnerType.TEAM ? teams[def.ownerKey].id : null,
        repositoryId: pick(repoIds),
        qualityIssueId: qualityIssue.id,
        recommendationId: recommendation?.id,
        createdById: users.admin.id,
        title: `Improve ${def.metricKey.replace(/_/g, ' ')}`,
        description: 'Seeded improvement goal tied to a measured baseline.',
        category: qualityIssue.category,
        metricKey: def.metricKey,
        direction: def.direction,
        baselineValue: def.baseline,
        targetValue: def.target,
        currentValue: def.current,
        status: def.status,
        dueDate: daysAgo(-30),
        lastMovementAt: daysAgo(2),
        completedAt: def.status === GoalStatus.COMPLETED ? daysAgo(1) : null,
      },
    });

    for (let p = 2; p >= 0; p -= 1) {
      const progressValue = def.direction === GoalDirection.INCREASE
        ? def.baseline + ((def.current - def.baseline) * (2 - p)) / 2
        : def.baseline - ((def.baseline - def.current) * (2 - p)) / 2;
      const percentComplete = round(
        Math.min(
          100,
          Math.abs((progressValue - def.baseline) / (def.target - def.baseline || 1)) * 100,
        ),
      );

      await prisma.improvementGoalProgress.create({
        data: {
          goalId: goal.id,
          recordedById: users.admin.id,
          progressDate: dateOnlyDaysAgo(p * 3),
          measuredValue: round(progressValue),
          deltaFromBaseline: round(progressValue - def.baseline),
          percentComplete,
          note: p === 0 ? 'Latest measured value from the most recent analysis run.' : undefined,
        },
      });
    }

    goals.push({ id: goal.id });
  }

  return goals;
}

// ---------------------------------------------------------------------------
// Achievements, notifications, audit log, sync jobs
// ---------------------------------------------------------------------------

async function seedAchievementProgress(
  organizationId: string,
  users: Record<string, { id: string }>,
  achievements: { id: string; targetValue: unknown }[],
) {
  for (const key of Object.keys(users)) {
    const chosen = pickMany(achievements, 3);
    for (const [index, achievement] of chosen.entries()) {
      const target = Number(achievement.targetValue);
      const earned = index === 0;
      const currentValue = earned ? target : round(target * (randomInt(30, 80) / 100));

      await prisma.userAchievement.upsert({
        where: { userId_achievementId: { userId: users[key].id, achievementId: achievement.id } },
        update: {},
        create: {
          organizationId,
          userId: users[key].id,
          achievementId: achievement.id,
          status: earned ? AchievementStatus.EARNED : AchievementStatus.IN_PROGRESS,
          currentValue,
          targetValue: target,
          progressPercent: round(Math.min(100, (currentValue / target) * 100)),
          earnedAt: earned ? daysAgo(randomInt(1, 30)) : null,
        },
      });
    }
  }
}

async function seedNotifications(organizationId: string, users: Record<string, { id: string }>) {
  for (const key of Object.keys(users)) {
    await prisma.notification.createMany({
      data: [
        {
          organizationId,
          userId: users[key].id,
          category: NotificationCategory.MILESTONE,
          channel: NotificationChannel.IN_APP,
          eventKey: 'achievement.earned',
          title: 'New achievement unlocked',
          body: "You've earned a new badge — check your achievements.",
          isRead: Math.random() < 0.5,
          createdAt: daysAgo(randomInt(1, 10)),
        },
        {
          organizationId,
          userId: users[key].id,
          category: NotificationCategory.ALERT,
          channel: NotificationChannel.IN_APP,
          eventKey: 'goal.at_risk',
          title: 'Goal at risk',
          body: 'One of your improvement goals has not moved in the last two weeks.',
          isRead: Math.random() < 0.3,
          createdAt: daysAgo(randomInt(0, 5)),
        },
      ],
    });
  }
}

async function seedAuditLog(organizationId: string, users: Record<string, { id: string }>) {
  const entries: { category: AuditCategory; action: string; summary: string }[] = [
    { category: AuditCategory.ORGANIZATION, action: 'organization.created', summary: `Organization '${ORG_NAME}' provisioned` },
    { category: AuditCategory.ROLE, action: 'role.assigned', summary: 'Assigned Organization Admin role to Ava Thompson' },
    { category: AuditCategory.REPOSITORY, action: 'repository.connected', summary: 'Connected 3 repositories from GitHub' },
    { category: AuditCategory.GOAL, action: 'goal.created', summary: 'Created improvement goal for coverage_percent' },
    { category: AuditCategory.AI, action: 'analysis.completed', summary: 'AI analysis run completed for customer-portal-web' },
    { category: AuditCategory.TEAM, action: 'team.created', summary: 'Created team Frontend Guild' },
    { category: AuditCategory.PROJECT, action: 'project.created', summary: 'Created project Customer Portal' },
    { category: AuditCategory.EXPERIMENT, action: 'experiment.proven', summary: 'Engineering experiment reached PROVEN status' },
  ];

  await prisma.auditLog.createMany({
    data: entries.map((entry, index) => ({
      organizationId,
      actorId: users.admin.id,
      category: entry.category,
      action: entry.action,
      summary: entry.summary,
      createdAt: daysAgo(entries.length - index),
    })),
  });
}

async function seedSyncJobs(
  organizationId: string,
  providerId: string,
  repositories: Record<string, { id: string }>,
  users: Record<string, { id: string }>,
) {
  for (const repo of Object.values(repositories)) {
    const fullImportStart = daysAgo(30);
    await prisma.syncJob.create({
      data: {
        organizationId,
        providerId,
        repositoryId: repo.id,
        requestedById: users.admin.id,
        jobType: SyncJobType.FULL_IMPORT,
        status: SyncJobStatus.COMPLETED,
        progressPercent: 100,
        itemsProcessed: randomInt(100, 500),
        itemsTotal: randomInt(100, 500),
        startedAt: fullImportStart,
        finishedAt: new Date(fullImportStart.getTime() + 5 * 60 * 1000),
      },
    });

    const incrementalStart = daysAgo(0);
    await prisma.syncJob.create({
      data: {
        organizationId,
        providerId,
        repositoryId: repo.id,
        requestedById: users.admin.id,
        jobType: SyncJobType.INCREMENTAL,
        status: SyncJobStatus.COMPLETED,
        progressPercent: 100,
        itemsProcessed: randomInt(5, 40),
        itemsTotal: randomInt(5, 40),
        startedAt: incrementalStart,
        finishedAt: new Date(incrementalStart.getTime() + 60 * 1000),
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Improvement Engine: experiments, metrics, proof
// ---------------------------------------------------------------------------

async function seedExperiments(
  organizationId: string,
  users: Record<string, { id: string }>,
  teams: Record<string, { id: string }>,
  projects: Record<string, { id: string }>,
  repositories: Record<string, { id: string }>,
  recommendations: { id: string; category: QualityCategory }[],
  goals: { id: string }[],
) {
  const provenStart = daysAgo(45);
  const provenEnd = daysAgo(5);
  const proven = await prisma.engineeringExperiment.create({
    data: {
      organizationId,
      userId: users.beLead.id,
      teamId: teams.BE.id,
      projectId: projects.CP.id,
      repositoryId: repositories['1002'].id,
      recommendationId: recommendations[0]?.id,
      goalId: goals[0]?.id,
      createdById: users.beLead.id,
      title: 'Reduce PR review turnaround on customer-portal-api',
      description: 'Trialled a review-rotation policy to cut time-to-first-review.',
      problemStatement: 'Reviews on customer-portal-api regularly take over 24 hours, slowing delivery.',
      hypothesis: 'A fixed daily review rotation will cut median time-to-first-review by at least 40%.',
      intervention: 'Assigned a rotating primary reviewer per day and enforced a same-day review SLA.',
      status: ExperimentStatus.PROVEN,
      startDate: provenStart,
      endDate: provenEnd,
      completedAt: provenEnd,
      baselineSummary: { medianReviewHours: 30 },
      targetSummary: { medianReviewHours: 12 },
      resultSummary: { medianReviewHours: 11 },
      confidence: ExperimentConfidence.HIGH,
    },
  });

  const provenMetric = await prisma.experimentMetric.create({
    data: {
      experimentId: proven.id,
      metricName: 'Median review turnaround',
      metricKey: 'review_turnaround_hours',
      metricType: MetricType.DURATION,
      unit: 'hours',
      direction: MetricDirection.DECREASE,
      baselineValue: 30,
      targetValue: 12,
      currentValue: 11,
      finalValue: 11,
      baselinePeriodStart: provenStart,
      baselinePeriodEnd: daysAgo(35),
      measurementPeriodStart: daysAgo(10),
      measurementPeriodEnd: provenEnd,
      isPrimary: true,
    },
  });

  await prisma.improvementProof.create({
    data: {
      organizationId,
      experimentId: proven.id,
      primaryMetricId: provenMetric.id,
      verificationStatus: VerificationStatus.ACHIEVED,
      baselineValue: 30,
      finalValue: 11,
      targetValue: 12,
      improvementPercentage: round(((30 - 11) / 30) * 100),
      targetAchieved: true,
      confidence: ExperimentConfidence.HIGH,
      evidenceSummary: 'Median review turnaround dropped from 30h to 11h across the measurement window.',
      resultSummary: 'Review rotation policy proven effective; recommend rolling out to other repositories.',
      verifiedAt: provenEnd,
    },
  });

  await prisma.engineeringExperiment.create({
    data: {
      organizationId,
      userId: users.feLead.id,
      teamId: teams.FE.id,
      projectId: projects.CP.id,
      repositoryId: repositories['1001'].id,
      recommendationId: recommendations[1]?.id,
      createdById: users.feLead.id,
      title: 'Cut duplicate component code on customer-portal-web',
      description: 'Extracting shared UI primitives to reduce duplication percentage.',
      problemStatement: 'Duplication percentage on the frontend repo has climbed above 8%.',
      hypothesis: 'Extracting 5 shared components will bring duplication under 4%.',
      intervention: 'Identified top duplicate blocks via analysis and extracted them into a shared package.',
      status: ExperimentStatus.ACTIVE,
      startDate: daysAgo(10),
      baselineSummary: { duplicationPercent: 8.4 },
      targetSummary: { duplicationPercent: 4 },
    },
  });
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  console.log('Seeding Devlytics demo data...');

  await syncPermissions();
  const achievements = await syncAchievements();
  await resetOrganization();
  const organization = await seedOrganization();
  await provisionOrganization(organization.id);

  const users = await seedUsers(organization.id);
  const { teams } = await seedOrgStructure(organization.id, users);
  const projects = await seedProjects(organization.id, users, teams);

  const gitProvider = await seedGitProvider(organization.id, users.admin.id);
  const gitAccounts = await seedGitAccounts(organization.id, gitProvider.id, users);
  const repositories = await seedRepositories(organization.id, gitProvider.id, projects, teams);
  await seedRepositoryMembers(organization.id, repositories, users);
  await seedActivity(organization.id, repositories, users, gitAccounts);

  const ollamaProvider = await prisma.aiProvider.findFirstOrThrow({
    where: { organizationId: organization.id, providerType: 'OLLAMA' },
  });

  const analysisRuns = await seedAiAnalysis(organization.id, repositories, projects, users, ollamaProvider.id);
  const qualityIssues = await seedQualityIssues(organization.id, analysisRuns, users, teams);
  const recommendations = await seedRecommendations(organization.id, analysisRuns, qualityIssues);
  await seedQualitySnapshots(organization.id, repositories, projects);
  await seedMetricsAndScores(organization.id, users, teams);
  await seedAiIntegration(organization.id, ollamaProvider.id);
  await seedAiUsage(organization.id, ollamaProvider.id, users, repositories);
  await seedSelfEvaluations(organization.id, users, teams);
  const goals = await seedGoals(organization.id, users, teams, repositories, qualityIssues, recommendations);
  await seedAchievementProgress(organization.id, users, achievements);
  await seedNotifications(organization.id, users);
  await seedAuditLog(organization.id, users);
  await seedSyncJobs(organization.id, gitProvider.id, repositories, users);
  await seedExperiments(organization.id, users, teams, projects, repositories, recommendations, goals);

  console.log('Seed complete.');
  console.log(`Organization: ${ORG_NAME} (${ORG_SLUG})`);
  console.log(`Demo login: ${USER_DEFS[0].email} / ${DEMO_PASSWORD}`);
  console.log('All seeded users share the same demo password.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
