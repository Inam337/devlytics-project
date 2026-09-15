-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED', 'REMOVED');

-- CreateEnum
CREATE TYPE "RoleKey" AS ENUM ('ORGANIZATION_ADMIN', 'DEPARTMENT_MANAGER', 'TEAM_LEAD', 'DEVELOPER', 'AUDITOR', 'BILLING');

-- CreateEnum
CREATE TYPE "TeamStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AvatarType" AS ENUM ('IMAGE', 'INITIALS', 'ICON');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'AT_RISK', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GitProviderType" AS ENUM ('GITHUB', 'GITLAB');

-- CreateEnum
CREATE TYPE "ProviderStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'TOKEN_EXPIRED', 'RATE_LIMITED');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('NEVER_SYNCED', 'QUEUED', 'SYNCING', 'SYNCED', 'PARTIAL', 'FAILED', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "RepositoryVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'INTERNAL');

-- CreateEnum
CREATE TYPE "GitIdentityClassification" AS ENUM ('MATCHED', 'UNMATCHED', 'BOT');

-- CreateEnum
CREATE TYPE "PullRequestStatus" AS ENUM ('DRAFT', 'OPEN', 'MERGED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ReviewState" AS ENUM ('PENDING', 'APPROVED', 'CHANGES_REQUESTED', 'COMMENTED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "PipelineStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('IN_PROGRESS', 'SUCCESS', 'FAILED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "MaintainabilityRating" AS ENUM ('A', 'B', 'C', 'D', 'E');

-- CreateEnum
CREATE TYPE "ScoreCategory" AS ENUM ('CODE_QUALITY', 'DELIVERY', 'CODE_REVIEW', 'TESTING', 'RELIABILITY', 'COLLABORATION', 'DOCUMENTATION', 'PROJECT_IMPACT');

-- CreateEnum
CREATE TYPE "RankingPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "RankingSubjectType" AS ENUM ('DEVELOPER', 'TEAM', 'PROJECT');

-- CreateEnum
CREATE TYPE "ScoreFreshness" AS ENUM ('LIVE', 'PARTIAL', 'STALE');

-- CreateEnum
CREATE TYPE "AiProviderType" AS ENUM ('OLLAMA', 'OPENAI', 'CLAUDE', 'GEMINI');

-- CreateEnum
CREATE TYPE "AnalysisRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "AnalysisScope" AS ENUM ('REPOSITORY', 'PROJECT', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'INFO');

-- CreateEnum
CREATE TYPE "QualityCategory" AS ENUM ('DUPLICATION', 'PERFORMANCE', 'MAINTAINABILITY', 'TESTING', 'SECURITY', 'RELIABILITY', 'DOCUMENTATION', 'TECHNICAL_DEBT', 'ARCHITECTURE', 'COMPLEXITY');

-- CreateEnum
CREATE TYPE "QualityIssueStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'WONT_FIX', 'FALSE_POSITIVE');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'REJECTED', 'IMPLEMENTED');

-- CreateEnum
CREATE TYPE "EffortLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ImpactLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "SelfEvaluationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REVIEWED');

-- CreateEnum
CREATE TYPE "GoalOwnerType" AS ENUM ('DEVELOPER', 'TEAM');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'AT_RISK', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "GoalDirection" AS ENUM ('INCREASE', 'DECREASE');

-- CreateEnum
CREATE TYPE "AchievementStatus" AS ENUM ('LOCKED', 'IN_PROGRESS', 'EARNED');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('TRANSACTIONAL', 'DIGEST', 'MILESTONE', 'ALERT');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');

-- CreateEnum
CREATE TYPE "AuditCategory" AS ENUM ('SCORING', 'INTEGRATION', 'REPOSITORY', 'USER', 'ROLE', 'AI', 'ORGANIZATION', 'TEAM', 'PROJECT', 'GOAL', 'AUTH');

-- CreateEnum
CREATE TYPE "SyncJobType" AS ENUM ('FULL_IMPORT', 'INCREMENTAL', 'WEBHOOK', 'RECONCILE', 'IDENTITY_MATCH');

-- CreateEnum
CREATE TYPE "SyncJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'RETRYING');

-- CreateTable
CREATE TABLE "tbl_organization" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "industry" VARCHAR(100),
    "logo_url" TEXT,
    "favicon_url" TEXT,
    "primary_color" VARCHAR(16) NOT NULL DEFAULT '#372b73',
    "secondary_color" VARCHAR(16) NOT NULL DEFAULT '#0B7D9E',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'UTC',
    "date_format" VARCHAR(32) NOT NULL DEFAULT 'YYYY-MM-DD',
    "currency" VARCHAR(8) NOT NULL DEFAULT 'USD',
    "active_weight_version" INTEGER NOT NULL DEFAULT 1,
    "onboarding_state" JSONB,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tbl_organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_user" (
    "id" UUID NOT NULL,
    "first_name" VARCHAR(80) NOT NULL,
    "last_name" VARCHAR(80) NOT NULL,
    "email" CITEXT NOT NULL,
    "password_hash" TEXT,
    "avatar_url" TEXT,
    "job_title" VARCHAR(120),
    "employee_code" VARCHAR(60),
    "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
    "last_login_at" TIMESTAMPTZ(6),
    "last_active_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tbl_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_organization_user" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'INVITED',
    "invited_at" TIMESTAMPTZ(6),
    "joined_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tbl_organization_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_role" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "key" "RoleKey" NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tbl_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_permission" (
    "id" UUID NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "resource" VARCHAR(60) NOT NULL,
    "action" VARCHAR(40) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbl_permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_role_permission" (
    "id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbl_role_permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_refresh_token" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "family_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "replaced_by_id" UUID,
    "user_agent" VARCHAR(255),
    "ip_address" VARCHAR(64),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbl_refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_password_reset_token" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbl_password_reset_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_department" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "description" TEXT,
    "manager_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tbl_department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_team" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "department_id" UUID,
    "name" VARCHAR(120) NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "description" TEXT,
    "avatar_url" TEXT,
    "avatar_type" "AvatarType" NOT NULL DEFAULT 'INITIALS',
    "team_color" VARCHAR(16) NOT NULL DEFAULT '#372b73',
    "team_lead_id" UUID,
    "status" "TeamStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tbl_team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_team_member" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "position_title" VARCHAR(120),
    "is_lead" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbl_team_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_project" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "project_key" VARCHAR(40),
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "progress_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "start_date" DATE,
    "end_date" DATE,
    "owner_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tbl_project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_project_team" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbl_project_team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_project_member" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_label" VARCHAR(80),
    "allocation_percent" INTEGER NOT NULL DEFAULT 100,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbl_project_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_git_provider" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "provider_type" "GitProviderType" NOT NULL,
    "display_name" VARCHAR(120) NOT NULL,
    "base_url" TEXT NOT NULL DEFAULT 'https://api.github.com',
    "external_account_id" VARCHAR(120),
    "external_account_name" VARCHAR(160),
    "access_token_encrypted" TEXT,
    "refresh_token_encrypted" TEXT,
    "token_expires_at" TIMESTAMPTZ(6),
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "webhook_secret_encrypted" TEXT,
    "status" "ProviderStatus" NOT NULL DEFAULT 'CONNECTED',
    "last_sync_at" TIMESTAMPTZ(6),
    "last_error_message" TEXT,
    "connected_by_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tbl_git_provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_git_account" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "user_id" UUID,
    "external_user_id" VARCHAR(120),
    "username" VARCHAR(160) NOT NULL,
    "commit_email" CITEXT,
    "avatar_url" TEXT,
    "classification" "GitIdentityClassification" NOT NULL DEFAULT 'UNMATCHED',
    "is_bot" BOOLEAN NOT NULL DEFAULT false,
    "matched_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tbl_git_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_repository" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "project_id" UUID,
    "team_id" UUID,
    "external_repository_id" VARCHAR(120) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "clone_url" TEXT,
    "default_branch" VARCHAR(120) NOT NULL DEFAULT 'main',
    "language" VARCHAR(80),
    "visibility" "RepositoryVisibility" NOT NULL DEFAULT 'PRIVATE',
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "last_sync_at" TIMESTAMPTZ(6),
    "sync_status" "SyncStatus" NOT NULL DEFAULT 'NEVER_SYNCED',
    "sync_error" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tbl_repository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_repository_member" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "repository_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "access_level" VARCHAR(40) NOT NULL DEFAULT 'read',
    "contributions" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tbl_repository_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_commit" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "repository_id" UUID NOT NULL,
    "author_id" UUID,
    "git_account_id" UUID,
    "external_commit_id" VARCHAR(120) NOT NULL,
    "commit_hash" VARCHAR(80) NOT NULL,
    "message" TEXT,
    "branch_name" VARCHAR(160),
    "committed_at" TIMESTAMPTZ(6) NOT NULL,
    "additions" INTEGER NOT NULL DEFAULT 0,
    "deletions" INTEGER NOT NULL DEFAULT 0,
    "changed_files" INTEGER NOT NULL DEFAULT 0,
    "is_merge" BOOLEAN NOT NULL DEFAULT false,
    "is_bot" BOOLEAN NOT NULL DEFAULT false,
    "url" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbl_commit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_commit_file" (
    "id" UUID NOT NULL,
    "commit_id" UUID NOT NULL,
    "file_path" VARCHAR(512) NOT NULL,
    "change_type" VARCHAR(20) NOT NULL,
    "additions" INTEGER NOT NULL DEFAULT 0,
    "deletions" INTEGER NOT NULL DEFAULT 0,
    "language" VARCHAR(60),
    "is_test_file" BOOLEAN NOT NULL DEFAULT false,
    "is_doc_file" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbl_commit_file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_pull_request" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "repository_id" UUID NOT NULL,
    "author_id" UUID,
    "external_pr_id" VARCHAR(120) NOT NULL,
    "number" INTEGER NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "source_branch" VARCHAR(160),
    "target_branch" VARCHAR(160),
    "status" "PullRequestStatus" NOT NULL DEFAULT 'OPEN',
    "created_at_external" TIMESTAMPTZ(6) NOT NULL,
    "merged_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "first_review_at" TIMESTAMPTZ(6),
    "additions" INTEGER NOT NULL DEFAULT 0,
    "deletions" INTEGER NOT NULL DEFAULT 0,
    "changed_files" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "url" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tbl_pull_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_pull_request_review" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "pull_request_id" UUID NOT NULL,
    "reviewer_id" UUID,
    "external_review_id" VARCHAR(120) NOT NULL,
    "state" "ReviewState" NOT NULL DEFAULT 'COMMENTED',
    "body" TEXT,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMPTZ(6) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbl_pull_request_review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_issue" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "repository_id" UUID NOT NULL,
    "creator_id" UUID,
    "assignee_id" UUID,
    "external_issue_id" VARCHAR(120) NOT NULL,
    "number" INTEGER NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at_external" TIMESTAMPTZ(6) NOT NULL,
    "closed_at" TIMESTAMPTZ(6),
    "url" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tbl_issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_ci_pipeline" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "repository_id" UUID NOT NULL,
    "external_pipeline_id" VARCHAR(120) NOT NULL,
    "name" VARCHAR(200),
    "branch_name" VARCHAR(160),
    "commit_hash" VARCHAR(80),
    "status" "PipelineStatus" NOT NULL DEFAULT 'QUEUED',
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "duration_seconds" INTEGER,
    "url" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbl_ci_pipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_deployment" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "repository_id" UUID NOT NULL,
    "external_deployment_id" VARCHAR(120) NOT NULL,
    "environment" VARCHAR(80) NOT NULL DEFAULT 'production',
    "status" "DeploymentStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "commit_hash" VARCHAR(80),
    "deployed_at" TIMESTAMPTZ(6) NOT NULL,
    "url" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbl_deployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_code_quality_snapshot" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "repository_id" UUID NOT NULL,
    "project_id" UUID,
    "analysis_run_id" UUID,
    "snapshot_date" DATE NOT NULL,
    "quality_score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "bugs" INTEGER NOT NULL DEFAULT 0,
    "vulnerabilities" INTEGER NOT NULL DEFAULT 0,
    "security_hotspots" INTEGER NOT NULL DEFAULT 0,
    "code_smells" INTEGER NOT NULL DEFAULT 0,
    "coverage_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "duplication_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "complexity" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "maintainability_score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "maintainability_rating" "MaintainabilityRating" NOT NULL DEFAULT 'C',
    "technical_debt_minutes" INTEGER NOT NULL DEFAULT 0,
    "loc_total" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbl_code_quality_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_developer_daily_metric" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "metric_date" DATE NOT NULL,
    "commits" INTEGER NOT NULL DEFAULT 0,
    "prs_created" INTEGER NOT NULL DEFAULT 0,
    "prs_merged" INTEGER NOT NULL DEFAULT 0,
    "prs_reviewed" INTEGER NOT NULL DEFAULT 0,
    "reviews_given" INTEGER NOT NULL DEFAULT 0,
    "issues_created" INTEGER NOT NULL DEFAULT 0,
    "issues_resolved" INTEGER NOT NULL DEFAULT 0,
    "loc_added" INTEGER NOT NULL DEFAULT 0,
    "loc_removed" INTEGER NOT NULL DEFAULT 0,
    "files_changed" INTEGER NOT NULL DEFAULT 0,
    "tests_added" INTEGER NOT NULL DEFAULT 0,
    "tests_changed" INTEGER NOT NULL DEFAULT 0,
    "docs_changed" INTEGER NOT NULL DEFAULT 0,
    "builds" INTEGER NOT NULL DEFAULT 0,
    "successful_builds" INTEGER NOT NULL DEFAULT 0,
    "failed_builds" INTEGER NOT NULL DEFAULT 0,
    "quality_score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "delivery_score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "review_score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "testing_score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "reliability_score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tbl_developer_daily_metric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_team_daily_metric" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "metric_date" DATE NOT NULL,
    "active_developers" INTEGER NOT NULL DEFAULT 0,
    "commits" INTEGER NOT NULL DEFAULT 0,
    "prs_created" INTEGER NOT NULL DEFAULT 0,
    "prs_merged" INTEGER NOT NULL DEFAULT 0,
    "reviews_given" INTEGER NOT NULL DEFAULT 0,
    "issues_resolved" INTEGER NOT NULL DEFAULT 0,
    "loc_added" INTEGER NOT NULL DEFAULT 0,
    "loc_removed" INTEGER NOT NULL DEFAULT 0,
    "builds" INTEGER NOT NULL DEFAULT 0,
    "successful_builds" INTEGER NOT NULL DEFAULT 0,
    "failed_builds" INTEGER NOT NULL DEFAULT 0,
    "quality_score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "delivery_score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "review_score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "testing_score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "reliability_score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tbl_team_daily_metric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_scoring_rule" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "weight_version" INTEGER NOT NULL,
    "category" "ScoreCategory" NOT NULL,
    "weight_percent" DECIMAL(5,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "effective_from" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tbl_scoring_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_developer_score" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "period" "RankingPeriod" NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "weight_version" INTEGER NOT NULL,
    "total_score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "code_quality_score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "delivery_score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "code_review_score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "testing_score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "reliability_score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "collaboration_score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "documentation_score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "project_impact_score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "loc_added" INTEGER NOT NULL DEFAULT 0,
    "loc_removed" INTEGER NOT NULL DEFAULT 0,
    "freshness" "ScoreFreshness" NOT NULL DEFAULT 'LIVE',
    "computed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbl_developer_score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_team_score" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "period" "RankingPeriod" NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "weight_version" INTEGER NOT NULL,
    "total_score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "code_quality_score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "delivery_score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "code_review_score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "testing_score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "reliability_score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "collaboration_score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "documentation_score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "project_impact_score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "member_count" INTEGER NOT NULL DEFAULT 0,
    "freshness" "ScoreFreshness" NOT NULL DEFAULT 'LIVE',
    "computed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbl_team_score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_ranking_history" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "subject_type" "RankingSubjectType" NOT NULL,
    "subject_id" UUID NOT NULL,
    "user_id" UUID,
    "team_id" UUID,
    "period" "RankingPeriod" NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "weight_version" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "previous_rank" INTEGER,
    "rank_delta" INTEGER NOT NULL DEFAULT 0,
    "score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "total_subjects" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbl_ranking_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_ai_provider" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "provider_type" "AiProviderType" NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "is_local" BOOLEAN NOT NULL DEFAULT true,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "default_model" VARCHAR(120) NOT NULL DEFAULT 'llama3.1',
    "base_url" TEXT NOT NULL DEFAULT 'http://localhost:11434',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tbl_ai_provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_ai_integration" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "model" VARCHAR(120) NOT NULL,
    "api_key_encrypted" TEXT,
    "base_url" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sanitize_context" BOOLEAN NOT NULL DEFAULT true,
    "max_tokens" INTEGER NOT NULL DEFAULT 2048,
    "temperature" DECIMAL(3,2) NOT NULL DEFAULT 0.2,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tbl_ai_integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_ai_usage" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "provider_id" UUID,
    "user_id" UUID,
    "team_id" UUID,
    "project_id" UUID,
    "repository_id" UUID,
    "tool_name" VARCHAR(80) NOT NULL,
    "usage_date" DATE NOT NULL,
    "request_count" INTEGER NOT NULL DEFAULT 0,
    "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
    "completion_tokens" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbl_ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_ai_analysis_run" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "provider_id" UUID,
    "repository_id" UUID,
    "project_id" UUID,
    "requested_by_id" UUID,
    "run_number" INTEGER NOT NULL,
    "scope" "AnalysisScope" NOT NULL DEFAULT 'REPOSITORY',
    "status" "AnalysisRunStatus" NOT NULL DEFAULT 'QUEUED',
    "model" VARCHAR(120),
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "duration_ms" INTEGER,
    "files_analyzed" INTEGER NOT NULL DEFAULT 0,
    "issues_found" INTEGER NOT NULL DEFAULT 0,
    "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
    "completion_tokens" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "observed_facts" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tbl_ai_analysis_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_code_quality_issue" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "analysis_run_id" UUID,
    "repository_id" UUID NOT NULL,
    "assigned_user_id" UUID,
    "assigned_team_id" UUID,
    "rule_id" VARCHAR(120) NOT NULL,
    "category" "QualityCategory" NOT NULL,
    "severity" "IssueSeverity" NOT NULL DEFAULT 'MAJOR',
    "status" "QualityIssueStatus" NOT NULL DEFAULT 'OPEN',
    "title" VARCHAR(300) NOT NULL,
    "observed_fact" TEXT NOT NULL,
    "ai_inference" TEXT,
    "ai_confidence" DECIMAL(4,3),
    "file_path" VARCHAR(512),
    "line_start" INTEGER,
    "line_end" INTEGER,
    "effort" "EffortLevel" NOT NULL DEFAULT 'MEDIUM',
    "impact" "ImpactLevel" NOT NULL DEFAULT 'MEDIUM',
    "metric_key" VARCHAR(80),
    "measured_value" DECIMAL(12,3),
    "resolved_at" TIMESTAMPTZ(6),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tbl_code_quality_issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_improvement_recommendation" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "analysis_run_id" UUID,
    "quality_issue_id" UUID,
    "category" "QualityCategory" NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "recommendation" TEXT NOT NULL,
    "rationale" TEXT,
    "ai_confidence" DECIMAL(4,3),
    "effort" "EffortLevel" NOT NULL DEFAULT 'MEDIUM',
    "impact" "ImpactLevel" NOT NULL DEFAULT 'MEDIUM',
    "priority" INTEGER NOT NULL DEFAULT 3,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'PROPOSED',
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tbl_improvement_recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_self_evaluation" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "repository_id" UUID,
    "project_id" UUID,
    "reviewer_id" UUID,
    "period" "RankingPeriod" NOT NULL DEFAULT 'MONTHLY',
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "status" "SelfEvaluationStatus" NOT NULL DEFAULT 'DRAFT',
    "summary" TEXT,
    "overall_rating" INTEGER,
    "submitted_at" TIMESTAMPTZ(6),
    "reviewed_at" TIMESTAMPTZ(6),
    "reviewer_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tbl_self_evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_self_evaluation_item" (
    "id" UUID NOT NULL,
    "self_evaluation_id" UUID NOT NULL,
    "category" "ScoreCategory" NOT NULL,
    "self_rating" INTEGER NOT NULL,
    "measured_score" DECIMAL(6,2),
    "comment" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbl_self_evaluation_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_improvement_goal" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "owner_type" "GoalOwnerType" NOT NULL,
    "owner_user_id" UUID,
    "owner_team_id" UUID,
    "repository_id" UUID,
    "quality_issue_id" UUID,
    "recommendation_id" UUID,
    "created_by_id" UUID,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "category" "QualityCategory" NOT NULL,
    "metric_key" VARCHAR(80) NOT NULL,
    "direction" "GoalDirection" NOT NULL DEFAULT 'INCREASE',
    "baseline_value" DECIMAL(12,3) NOT NULL,
    "target_value" DECIMAL(12,3) NOT NULL,
    "current_value" DECIMAL(12,3) NOT NULL,
    "baseline_run_id" UUID,
    "verified_run_id" UUID,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "due_date" DATE,
    "last_movement_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tbl_improvement_goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_improvement_goal_progress" (
    "id" UUID NOT NULL,
    "goal_id" UUID NOT NULL,
    "analysis_run_id" UUID,
    "recorded_by_id" UUID,
    "progress_date" DATE NOT NULL,
    "measured_value" DECIMAL(12,3) NOT NULL,
    "delta_from_baseline" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "percent_complete" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbl_improvement_goal_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_achievement" (
    "id" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT NOT NULL,
    "icon" VARCHAR(80),
    "category" VARCHAR(60) NOT NULL,
    "metric_key" VARCHAR(80) NOT NULL,
    "target_value" DECIMAL(12,3) NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 10,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbl_achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_user_achievement" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "achievement_id" UUID NOT NULL,
    "status" "AchievementStatus" NOT NULL DEFAULT 'LOCKED',
    "current_value" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "target_value" DECIMAL(12,3) NOT NULL,
    "progress_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "evidence" TEXT,
    "earned_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tbl_user_achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_notification" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category" "NotificationCategory" NOT NULL DEFAULT 'TRANSACTIONAL',
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "event_key" VARCHAR(80) NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "body" TEXT NOT NULL,
    "action_url" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(6),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbl_notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_audit_log" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "actor_id" UUID,
    "category" "AuditCategory" NOT NULL,
    "action" VARCHAR(120) NOT NULL,
    "summary" TEXT NOT NULL,
    "entity_type" VARCHAR(80),
    "entity_id" UUID,
    "before_value" JSONB,
    "after_value" JSONB,
    "reason" TEXT,
    "ip_address" VARCHAR(64),
    "user_agent" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbl_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_sync_job" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "provider_id" UUID,
    "repository_id" UUID,
    "requested_by_id" UUID,
    "job_type" "SyncJobType" NOT NULL,
    "status" "SyncJobStatus" NOT NULL DEFAULT 'QUEUED',
    "queue_name" VARCHAR(60) NOT NULL DEFAULT 'git-sync',
    "external_job_id" VARCHAR(120),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "progress_percent" INTEGER NOT NULL DEFAULT 0,
    "items_processed" INTEGER NOT NULL DEFAULT 0,
    "items_total" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "error_message" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tbl_sync_job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tbl_organization_slug_key" ON "tbl_organization"("slug");

-- CreateIndex
CREATE INDEX "tbl_organization_status_idx" ON "tbl_organization"("status");

-- CreateIndex
CREATE INDEX "tbl_organization_created_at_idx" ON "tbl_organization"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_user_email_key" ON "tbl_user"("email");

-- CreateIndex
CREATE INDEX "tbl_user_status_idx" ON "tbl_user"("status");

-- CreateIndex
CREATE INDEX "tbl_user_last_active_at_idx" ON "tbl_user"("last_active_at");

-- CreateIndex
CREATE INDEX "tbl_organization_user_organization_id_status_idx" ON "tbl_organization_user"("organization_id", "status");

-- CreateIndex
CREATE INDEX "tbl_organization_user_organization_id_role_id_idx" ON "tbl_organization_user"("organization_id", "role_id");

-- CreateIndex
CREATE INDEX "tbl_organization_user_user_id_idx" ON "tbl_organization_user"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_organization_user_organization_id_user_id_key" ON "tbl_organization_user"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "tbl_role_organization_id_idx" ON "tbl_role"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_role_organization_id_key_key" ON "tbl_role"("organization_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_permission_key_key" ON "tbl_permission"("key");

-- CreateIndex
CREATE INDEX "tbl_permission_resource_idx" ON "tbl_permission"("resource");

-- CreateIndex
CREATE INDEX "tbl_role_permission_permission_id_idx" ON "tbl_role_permission"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_role_permission_role_id_permission_id_key" ON "tbl_role_permission"("role_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_refresh_token_token_hash_key" ON "tbl_refresh_token"("token_hash");

-- CreateIndex
CREATE INDEX "tbl_refresh_token_user_id_revoked_at_idx" ON "tbl_refresh_token"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "tbl_refresh_token_family_id_idx" ON "tbl_refresh_token"("family_id");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_password_reset_token_token_hash_key" ON "tbl_password_reset_token"("token_hash");

-- CreateIndex
CREATE INDEX "tbl_password_reset_token_user_id_used_at_idx" ON "tbl_password_reset_token"("user_id", "used_at");

-- CreateIndex
CREATE INDEX "tbl_department_organization_id_idx" ON "tbl_department"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_department_organization_id_code_key" ON "tbl_department"("organization_id", "code");

-- CreateIndex
CREATE INDEX "tbl_team_organization_id_status_idx" ON "tbl_team"("organization_id", "status");

-- CreateIndex
CREATE INDEX "tbl_team_organization_id_department_id_idx" ON "tbl_team"("organization_id", "department_id");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_team_organization_id_code_key" ON "tbl_team"("organization_id", "code");

-- CreateIndex
CREATE INDEX "tbl_team_member_organization_id_user_id_idx" ON "tbl_team_member"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "tbl_team_member_team_id_idx" ON "tbl_team_member"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_team_member_team_id_user_id_key" ON "tbl_team_member"("team_id", "user_id");

-- CreateIndex
CREATE INDEX "tbl_project_organization_id_status_idx" ON "tbl_project"("organization_id", "status");

-- CreateIndex
CREATE INDEX "tbl_project_organization_id_created_at_idx" ON "tbl_project"("organization_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_project_organization_id_code_key" ON "tbl_project"("organization_id", "code");

-- CreateIndex
CREATE INDEX "tbl_project_team_organization_id_team_id_idx" ON "tbl_project_team"("organization_id", "team_id");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_project_team_project_id_team_id_key" ON "tbl_project_team"("project_id", "team_id");

-- CreateIndex
CREATE INDEX "tbl_project_member_organization_id_user_id_idx" ON "tbl_project_member"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_project_member_project_id_user_id_key" ON "tbl_project_member"("project_id", "user_id");

-- CreateIndex
CREATE INDEX "tbl_git_provider_organization_id_status_idx" ON "tbl_git_provider"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_git_provider_organization_id_provider_type_external_acc_key" ON "tbl_git_provider"("organization_id", "provider_type", "external_account_id");

-- CreateIndex
CREATE INDEX "tbl_git_account_organization_id_classification_idx" ON "tbl_git_account"("organization_id", "classification");

-- CreateIndex
CREATE INDEX "tbl_git_account_organization_id_user_id_idx" ON "tbl_git_account"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "tbl_git_account_commit_email_idx" ON "tbl_git_account"("commit_email");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_git_account_provider_id_username_key" ON "tbl_git_account"("provider_id", "username");

-- CreateIndex
CREATE INDEX "tbl_repository_organization_id_sync_status_idx" ON "tbl_repository"("organization_id", "sync_status");

-- CreateIndex
CREATE INDEX "tbl_repository_organization_id_project_id_idx" ON "tbl_repository"("organization_id", "project_id");

-- CreateIndex
CREATE INDEX "tbl_repository_organization_id_team_id_idx" ON "tbl_repository"("organization_id", "team_id");

-- CreateIndex
CREATE INDEX "tbl_repository_organization_id_created_at_idx" ON "tbl_repository"("organization_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_repository_provider_id_external_repository_id_key" ON "tbl_repository"("provider_id", "external_repository_id");

-- CreateIndex
CREATE INDEX "tbl_repository_member_organization_id_user_id_idx" ON "tbl_repository_member"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_repository_member_repository_id_user_id_key" ON "tbl_repository_member"("repository_id", "user_id");

-- CreateIndex
CREATE INDEX "tbl_commit_repository_id_committed_at_idx" ON "tbl_commit"("repository_id", "committed_at");

-- CreateIndex
CREATE INDEX "tbl_commit_organization_id_committed_at_idx" ON "tbl_commit"("organization_id", "committed_at");

-- CreateIndex
CREATE INDEX "tbl_commit_organization_id_author_id_committed_at_idx" ON "tbl_commit"("organization_id", "author_id", "committed_at");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_commit_repository_id_external_commit_id_key" ON "tbl_commit"("repository_id", "external_commit_id");

-- CreateIndex
CREATE INDEX "tbl_commit_file_commit_id_idx" ON "tbl_commit_file"("commit_id");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_commit_file_commit_id_file_path_key" ON "tbl_commit_file"("commit_id", "file_path");

-- CreateIndex
CREATE INDEX "tbl_pull_request_repository_id_created_at_external_idx" ON "tbl_pull_request"("repository_id", "created_at_external");

-- CreateIndex
CREATE INDEX "tbl_pull_request_organization_id_status_idx" ON "tbl_pull_request"("organization_id", "status");

-- CreateIndex
CREATE INDEX "tbl_pull_request_organization_id_author_id_created_at_exter_idx" ON "tbl_pull_request"("organization_id", "author_id", "created_at_external");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_pull_request_repository_id_external_pr_id_key" ON "tbl_pull_request"("repository_id", "external_pr_id");

-- CreateIndex
CREATE INDEX "tbl_pull_request_review_organization_id_reviewer_id_submitt_idx" ON "tbl_pull_request_review"("organization_id", "reviewer_id", "submitted_at");

-- CreateIndex
CREATE INDEX "tbl_pull_request_review_pull_request_id_idx" ON "tbl_pull_request_review"("pull_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_pull_request_review_pull_request_id_external_review_id_key" ON "tbl_pull_request_review"("pull_request_id", "external_review_id");

-- CreateIndex
CREATE INDEX "tbl_issue_repository_id_created_at_external_idx" ON "tbl_issue"("repository_id", "created_at_external");

-- CreateIndex
CREATE INDEX "tbl_issue_organization_id_status_idx" ON "tbl_issue"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_issue_repository_id_external_issue_id_key" ON "tbl_issue"("repository_id", "external_issue_id");

-- CreateIndex
CREATE INDEX "tbl_ci_pipeline_repository_id_created_at_idx" ON "tbl_ci_pipeline"("repository_id", "created_at");

-- CreateIndex
CREATE INDEX "tbl_ci_pipeline_organization_id_status_idx" ON "tbl_ci_pipeline"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_ci_pipeline_repository_id_external_pipeline_id_key" ON "tbl_ci_pipeline"("repository_id", "external_pipeline_id");

-- CreateIndex
CREATE INDEX "tbl_deployment_repository_id_deployed_at_idx" ON "tbl_deployment"("repository_id", "deployed_at");

-- CreateIndex
CREATE INDEX "tbl_deployment_organization_id_environment_idx" ON "tbl_deployment"("organization_id", "environment");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_deployment_repository_id_external_deployment_id_key" ON "tbl_deployment"("repository_id", "external_deployment_id");

-- CreateIndex
CREATE INDEX "tbl_code_quality_snapshot_repository_id_snapshot_date_idx" ON "tbl_code_quality_snapshot"("repository_id", "snapshot_date");

-- CreateIndex
CREATE INDEX "tbl_code_quality_snapshot_organization_id_snapshot_date_idx" ON "tbl_code_quality_snapshot"("organization_id", "snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_code_quality_snapshot_repository_id_snapshot_date_key" ON "tbl_code_quality_snapshot"("repository_id", "snapshot_date");

-- CreateIndex
CREATE INDEX "tbl_developer_daily_metric_user_id_metric_date_idx" ON "tbl_developer_daily_metric"("user_id", "metric_date");

-- CreateIndex
CREATE INDEX "tbl_developer_daily_metric_organization_id_metric_date_idx" ON "tbl_developer_daily_metric"("organization_id", "metric_date");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_developer_daily_metric_user_id_metric_date_key" ON "tbl_developer_daily_metric"("user_id", "metric_date");

-- CreateIndex
CREATE INDEX "tbl_team_daily_metric_team_id_metric_date_idx" ON "tbl_team_daily_metric"("team_id", "metric_date");

-- CreateIndex
CREATE INDEX "tbl_team_daily_metric_organization_id_metric_date_idx" ON "tbl_team_daily_metric"("organization_id", "metric_date");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_team_daily_metric_team_id_metric_date_key" ON "tbl_team_daily_metric"("team_id", "metric_date");

-- CreateIndex
CREATE INDEX "tbl_scoring_rule_organization_id_is_active_idx" ON "tbl_scoring_rule"("organization_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_scoring_rule_organization_id_weight_version_category_key" ON "tbl_scoring_rule"("organization_id", "weight_version", "category");

-- CreateIndex
CREATE INDEX "tbl_developer_score_organization_id_period_period_start_idx" ON "tbl_developer_score"("organization_id", "period", "period_start");

-- CreateIndex
CREATE INDEX "tbl_developer_score_user_id_period_idx" ON "tbl_developer_score"("user_id", "period");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_developer_score_user_id_period_period_start_weight_vers_key" ON "tbl_developer_score"("user_id", "period", "period_start", "weight_version");

-- CreateIndex
CREATE INDEX "tbl_team_score_organization_id_period_period_start_idx" ON "tbl_team_score"("organization_id", "period", "period_start");

-- CreateIndex
CREATE INDEX "tbl_team_score_team_id_period_idx" ON "tbl_team_score"("team_id", "period");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_team_score_team_id_period_period_start_weight_version_key" ON "tbl_team_score"("team_id", "period", "period_start", "weight_version");

-- CreateIndex
CREATE INDEX "tbl_ranking_history_organization_id_subject_type_period_per_idx" ON "tbl_ranking_history"("organization_id", "subject_type", "period", "period_start");

-- CreateIndex
CREATE INDEX "tbl_ranking_history_user_id_period_idx" ON "tbl_ranking_history"("user_id", "period");

-- CreateIndex
CREATE INDEX "tbl_ranking_history_team_id_period_idx" ON "tbl_ranking_history"("team_id", "period");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_ranking_history_organization_id_subject_type_subject_id_key" ON "tbl_ranking_history"("organization_id", "subject_type", "subject_id", "period", "period_start", "weight_version");

-- CreateIndex
CREATE INDEX "tbl_ai_provider_organization_id_is_enabled_idx" ON "tbl_ai_provider"("organization_id", "is_enabled");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_ai_provider_organization_id_provider_type_key" ON "tbl_ai_provider"("organization_id", "provider_type");

-- CreateIndex
CREATE INDEX "tbl_ai_integration_organization_id_is_enabled_idx" ON "tbl_ai_integration"("organization_id", "is_enabled");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_ai_integration_organization_id_name_key" ON "tbl_ai_integration"("organization_id", "name");

-- CreateIndex
CREATE INDEX "tbl_ai_usage_organization_id_usage_date_idx" ON "tbl_ai_usage"("organization_id", "usage_date");

-- CreateIndex
CREATE INDEX "tbl_ai_usage_organization_id_tool_name_idx" ON "tbl_ai_usage"("organization_id", "tool_name");

-- CreateIndex
CREATE INDEX "tbl_ai_usage_user_id_usage_date_idx" ON "tbl_ai_usage"("user_id", "usage_date");

-- CreateIndex
CREATE INDEX "tbl_ai_analysis_run_organization_id_status_idx" ON "tbl_ai_analysis_run"("organization_id", "status");

-- CreateIndex
CREATE INDEX "tbl_ai_analysis_run_repository_id_created_at_idx" ON "tbl_ai_analysis_run"("repository_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_ai_analysis_run_organization_id_run_number_key" ON "tbl_ai_analysis_run"("organization_id", "run_number");

-- CreateIndex
CREATE INDEX "tbl_code_quality_issue_organization_id_status_idx" ON "tbl_code_quality_issue"("organization_id", "status");

-- CreateIndex
CREATE INDEX "tbl_code_quality_issue_organization_id_severity_idx" ON "tbl_code_quality_issue"("organization_id", "severity");

-- CreateIndex
CREATE INDEX "tbl_code_quality_issue_repository_id_created_at_idx" ON "tbl_code_quality_issue"("repository_id", "created_at");

-- CreateIndex
CREATE INDEX "tbl_code_quality_issue_analysis_run_id_idx" ON "tbl_code_quality_issue"("analysis_run_id");

-- CreateIndex
CREATE INDEX "tbl_improvement_recommendation_organization_id_status_idx" ON "tbl_improvement_recommendation"("organization_id", "status");

-- CreateIndex
CREATE INDEX "tbl_improvement_recommendation_organization_id_category_idx" ON "tbl_improvement_recommendation"("organization_id", "category");

-- CreateIndex
CREATE INDEX "tbl_improvement_recommendation_quality_issue_id_idx" ON "tbl_improvement_recommendation"("quality_issue_id");

-- CreateIndex
CREATE INDEX "tbl_self_evaluation_organization_id_status_idx" ON "tbl_self_evaluation"("organization_id", "status");

-- CreateIndex
CREATE INDEX "tbl_self_evaluation_organization_id_user_id_idx" ON "tbl_self_evaluation"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_self_evaluation_user_id_period_period_start_key" ON "tbl_self_evaluation"("user_id", "period", "period_start");

-- CreateIndex
CREATE INDEX "tbl_self_evaluation_item_self_evaluation_id_idx" ON "tbl_self_evaluation_item"("self_evaluation_id");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_self_evaluation_item_self_evaluation_id_category_key" ON "tbl_self_evaluation_item"("self_evaluation_id", "category");

-- CreateIndex
CREATE INDEX "tbl_improvement_goal_organization_id_status_idx" ON "tbl_improvement_goal"("organization_id", "status");

-- CreateIndex
CREATE INDEX "tbl_improvement_goal_organization_id_owner_user_id_idx" ON "tbl_improvement_goal"("organization_id", "owner_user_id");

-- CreateIndex
CREATE INDEX "tbl_improvement_goal_organization_id_owner_team_id_idx" ON "tbl_improvement_goal"("organization_id", "owner_team_id");

-- CreateIndex
CREATE INDEX "tbl_improvement_goal_progress_goal_id_progress_date_idx" ON "tbl_improvement_goal_progress"("goal_id", "progress_date");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_achievement_key_key" ON "tbl_achievement"("key");

-- CreateIndex
CREATE INDEX "tbl_achievement_category_idx" ON "tbl_achievement"("category");

-- CreateIndex
CREATE INDEX "tbl_user_achievement_organization_id_status_idx" ON "tbl_user_achievement"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_user_achievement_user_id_achievement_id_key" ON "tbl_user_achievement"("user_id", "achievement_id");

-- CreateIndex
CREATE INDEX "tbl_notification_user_id_is_read_idx" ON "tbl_notification"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "tbl_notification_organization_id_created_at_idx" ON "tbl_notification"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "tbl_audit_log_organization_id_created_at_idx" ON "tbl_audit_log"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "tbl_audit_log_organization_id_category_idx" ON "tbl_audit_log"("organization_id", "category");

-- CreateIndex
CREATE INDEX "tbl_audit_log_organization_id_actor_id_idx" ON "tbl_audit_log"("organization_id", "actor_id");

-- CreateIndex
CREATE INDEX "tbl_sync_job_organization_id_status_idx" ON "tbl_sync_job"("organization_id", "status");

-- CreateIndex
CREATE INDEX "tbl_sync_job_repository_id_created_at_idx" ON "tbl_sync_job"("repository_id", "created_at");

-- CreateIndex
CREATE INDEX "tbl_sync_job_organization_id_job_type_idx" ON "tbl_sync_job"("organization_id", "job_type");

-- AddForeignKey
ALTER TABLE "tbl_organization_user" ADD CONSTRAINT "tbl_organization_user_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_organization_user" ADD CONSTRAINT "tbl_organization_user_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "tbl_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_organization_user" ADD CONSTRAINT "tbl_organization_user_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "tbl_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_role" ADD CONSTRAINT "tbl_role_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_role_permission" ADD CONSTRAINT "tbl_role_permission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "tbl_role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_role_permission" ADD CONSTRAINT "tbl_role_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "tbl_permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_refresh_token" ADD CONSTRAINT "tbl_refresh_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "tbl_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_refresh_token" ADD CONSTRAINT "tbl_refresh_token_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_password_reset_token" ADD CONSTRAINT "tbl_password_reset_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "tbl_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_department" ADD CONSTRAINT "tbl_department_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_department" ADD CONSTRAINT "tbl_department_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "tbl_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_team" ADD CONSTRAINT "tbl_team_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_team" ADD CONSTRAINT "tbl_team_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "tbl_department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_team" ADD CONSTRAINT "tbl_team_team_lead_id_fkey" FOREIGN KEY ("team_lead_id") REFERENCES "tbl_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_team_member" ADD CONSTRAINT "tbl_team_member_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_team_member" ADD CONSTRAINT "tbl_team_member_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "tbl_team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_team_member" ADD CONSTRAINT "tbl_team_member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "tbl_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_project" ADD CONSTRAINT "tbl_project_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_project" ADD CONSTRAINT "tbl_project_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "tbl_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_project_team" ADD CONSTRAINT "tbl_project_team_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_project_team" ADD CONSTRAINT "tbl_project_team_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "tbl_project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_project_team" ADD CONSTRAINT "tbl_project_team_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "tbl_team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_project_member" ADD CONSTRAINT "tbl_project_member_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_project_member" ADD CONSTRAINT "tbl_project_member_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "tbl_project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_project_member" ADD CONSTRAINT "tbl_project_member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "tbl_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_git_provider" ADD CONSTRAINT "tbl_git_provider_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_git_provider" ADD CONSTRAINT "tbl_git_provider_connected_by_id_fkey" FOREIGN KEY ("connected_by_id") REFERENCES "tbl_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_git_account" ADD CONSTRAINT "tbl_git_account_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_git_account" ADD CONSTRAINT "tbl_git_account_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "tbl_git_provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_git_account" ADD CONSTRAINT "tbl_git_account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "tbl_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_repository" ADD CONSTRAINT "tbl_repository_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_repository" ADD CONSTRAINT "tbl_repository_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "tbl_git_provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_repository" ADD CONSTRAINT "tbl_repository_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "tbl_project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_repository" ADD CONSTRAINT "tbl_repository_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "tbl_team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_repository_member" ADD CONSTRAINT "tbl_repository_member_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_repository_member" ADD CONSTRAINT "tbl_repository_member_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "tbl_repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_repository_member" ADD CONSTRAINT "tbl_repository_member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "tbl_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_commit" ADD CONSTRAINT "tbl_commit_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_commit" ADD CONSTRAINT "tbl_commit_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "tbl_repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_commit" ADD CONSTRAINT "tbl_commit_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "tbl_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_commit_file" ADD CONSTRAINT "tbl_commit_file_commit_id_fkey" FOREIGN KEY ("commit_id") REFERENCES "tbl_commit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_pull_request" ADD CONSTRAINT "tbl_pull_request_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_pull_request" ADD CONSTRAINT "tbl_pull_request_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "tbl_repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_pull_request" ADD CONSTRAINT "tbl_pull_request_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "tbl_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_pull_request_review" ADD CONSTRAINT "tbl_pull_request_review_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_pull_request_review" ADD CONSTRAINT "tbl_pull_request_review_pull_request_id_fkey" FOREIGN KEY ("pull_request_id") REFERENCES "tbl_pull_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_pull_request_review" ADD CONSTRAINT "tbl_pull_request_review_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "tbl_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_issue" ADD CONSTRAINT "tbl_issue_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_issue" ADD CONSTRAINT "tbl_issue_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "tbl_repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_issue" ADD CONSTRAINT "tbl_issue_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "tbl_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_issue" ADD CONSTRAINT "tbl_issue_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "tbl_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_ci_pipeline" ADD CONSTRAINT "tbl_ci_pipeline_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_ci_pipeline" ADD CONSTRAINT "tbl_ci_pipeline_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "tbl_repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_deployment" ADD CONSTRAINT "tbl_deployment_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_deployment" ADD CONSTRAINT "tbl_deployment_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "tbl_repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_code_quality_snapshot" ADD CONSTRAINT "tbl_code_quality_snapshot_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_code_quality_snapshot" ADD CONSTRAINT "tbl_code_quality_snapshot_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "tbl_repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_code_quality_snapshot" ADD CONSTRAINT "tbl_code_quality_snapshot_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "tbl_project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_code_quality_snapshot" ADD CONSTRAINT "tbl_code_quality_snapshot_analysis_run_id_fkey" FOREIGN KEY ("analysis_run_id") REFERENCES "tbl_ai_analysis_run"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_developer_daily_metric" ADD CONSTRAINT "tbl_developer_daily_metric_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_developer_daily_metric" ADD CONSTRAINT "tbl_developer_daily_metric_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "tbl_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_team_daily_metric" ADD CONSTRAINT "tbl_team_daily_metric_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_team_daily_metric" ADD CONSTRAINT "tbl_team_daily_metric_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "tbl_team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_scoring_rule" ADD CONSTRAINT "tbl_scoring_rule_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_scoring_rule" ADD CONSTRAINT "tbl_scoring_rule_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "tbl_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_developer_score" ADD CONSTRAINT "tbl_developer_score_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_developer_score" ADD CONSTRAINT "tbl_developer_score_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "tbl_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_team_score" ADD CONSTRAINT "tbl_team_score_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_team_score" ADD CONSTRAINT "tbl_team_score_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "tbl_team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_ranking_history" ADD CONSTRAINT "tbl_ranking_history_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_ranking_history" ADD CONSTRAINT "tbl_ranking_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "tbl_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_ranking_history" ADD CONSTRAINT "tbl_ranking_history_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "tbl_team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_ai_provider" ADD CONSTRAINT "tbl_ai_provider_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_ai_integration" ADD CONSTRAINT "tbl_ai_integration_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_ai_integration" ADD CONSTRAINT "tbl_ai_integration_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "tbl_ai_provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_ai_usage" ADD CONSTRAINT "tbl_ai_usage_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_ai_usage" ADD CONSTRAINT "tbl_ai_usage_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "tbl_ai_provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_ai_usage" ADD CONSTRAINT "tbl_ai_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "tbl_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_ai_usage" ADD CONSTRAINT "tbl_ai_usage_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "tbl_team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_ai_usage" ADD CONSTRAINT "tbl_ai_usage_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "tbl_project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_ai_usage" ADD CONSTRAINT "tbl_ai_usage_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "tbl_repository"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_ai_analysis_run" ADD CONSTRAINT "tbl_ai_analysis_run_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_ai_analysis_run" ADD CONSTRAINT "tbl_ai_analysis_run_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "tbl_ai_provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_ai_analysis_run" ADD CONSTRAINT "tbl_ai_analysis_run_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "tbl_repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_ai_analysis_run" ADD CONSTRAINT "tbl_ai_analysis_run_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "tbl_project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_ai_analysis_run" ADD CONSTRAINT "tbl_ai_analysis_run_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "tbl_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_code_quality_issue" ADD CONSTRAINT "tbl_code_quality_issue_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_code_quality_issue" ADD CONSTRAINT "tbl_code_quality_issue_analysis_run_id_fkey" FOREIGN KEY ("analysis_run_id") REFERENCES "tbl_ai_analysis_run"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_code_quality_issue" ADD CONSTRAINT "tbl_code_quality_issue_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "tbl_repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_code_quality_issue" ADD CONSTRAINT "tbl_code_quality_issue_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "tbl_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_code_quality_issue" ADD CONSTRAINT "tbl_code_quality_issue_assigned_team_id_fkey" FOREIGN KEY ("assigned_team_id") REFERENCES "tbl_team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_improvement_recommendation" ADD CONSTRAINT "tbl_improvement_recommendation_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_improvement_recommendation" ADD CONSTRAINT "tbl_improvement_recommendation_analysis_run_id_fkey" FOREIGN KEY ("analysis_run_id") REFERENCES "tbl_ai_analysis_run"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_improvement_recommendation" ADD CONSTRAINT "tbl_improvement_recommendation_quality_issue_id_fkey" FOREIGN KEY ("quality_issue_id") REFERENCES "tbl_code_quality_issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_self_evaluation" ADD CONSTRAINT "tbl_self_evaluation_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_self_evaluation" ADD CONSTRAINT "tbl_self_evaluation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "tbl_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_self_evaluation" ADD CONSTRAINT "tbl_self_evaluation_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "tbl_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_self_evaluation" ADD CONSTRAINT "tbl_self_evaluation_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "tbl_repository"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_self_evaluation" ADD CONSTRAINT "tbl_self_evaluation_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "tbl_project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_self_evaluation_item" ADD CONSTRAINT "tbl_self_evaluation_item_self_evaluation_id_fkey" FOREIGN KEY ("self_evaluation_id") REFERENCES "tbl_self_evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_improvement_goal" ADD CONSTRAINT "tbl_improvement_goal_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_improvement_goal" ADD CONSTRAINT "tbl_improvement_goal_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "tbl_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_improvement_goal" ADD CONSTRAINT "tbl_improvement_goal_owner_team_id_fkey" FOREIGN KEY ("owner_team_id") REFERENCES "tbl_team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_improvement_goal" ADD CONSTRAINT "tbl_improvement_goal_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "tbl_repository"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_improvement_goal" ADD CONSTRAINT "tbl_improvement_goal_quality_issue_id_fkey" FOREIGN KEY ("quality_issue_id") REFERENCES "tbl_code_quality_issue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_improvement_goal" ADD CONSTRAINT "tbl_improvement_goal_recommendation_id_fkey" FOREIGN KEY ("recommendation_id") REFERENCES "tbl_improvement_recommendation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_improvement_goal" ADD CONSTRAINT "tbl_improvement_goal_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "tbl_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_improvement_goal_progress" ADD CONSTRAINT "tbl_improvement_goal_progress_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "tbl_improvement_goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_improvement_goal_progress" ADD CONSTRAINT "tbl_improvement_goal_progress_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "tbl_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_user_achievement" ADD CONSTRAINT "tbl_user_achievement_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_user_achievement" ADD CONSTRAINT "tbl_user_achievement_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "tbl_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_user_achievement" ADD CONSTRAINT "tbl_user_achievement_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "tbl_achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_notification" ADD CONSTRAINT "tbl_notification_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_notification" ADD CONSTRAINT "tbl_notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "tbl_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_audit_log" ADD CONSTRAINT "tbl_audit_log_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_audit_log" ADD CONSTRAINT "tbl_audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "tbl_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_sync_job" ADD CONSTRAINT "tbl_sync_job_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_sync_job" ADD CONSTRAINT "tbl_sync_job_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "tbl_git_provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_sync_job" ADD CONSTRAINT "tbl_sync_job_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "tbl_repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_sync_job" ADD CONSTRAINT "tbl_sync_job_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "tbl_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
