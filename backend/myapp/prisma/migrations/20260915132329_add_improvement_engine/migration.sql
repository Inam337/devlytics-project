-- CreateEnum
CREATE TYPE "ExperimentStatus" AS ENUM ('DRAFT', 'PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'PROVEN', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExperimentConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'INSUFFICIENT_DATA');

-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('DURATION', 'COUNT', 'PERCENTAGE', 'RATIO', 'SCORE', 'SIZE', 'RATE');

-- CreateEnum
CREATE TYPE "MetricDirection" AS ENUM ('INCREASE', 'DECREASE', 'TARGET_RANGE');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'ACHIEVED', 'PARTIALLY_ACHIEVED', 'NOT_ACHIEVED', 'INSUFFICIENT_DATA');

-- AlterEnum
ALTER TYPE "AuditCategory" ADD VALUE 'EXPERIMENT';

-- CreateTable
CREATE TABLE "tbl_engineering_experiment" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID,
    "team_id" UUID,
    "project_id" UUID,
    "repository_id" UUID,
    "recommendation_id" UUID,
    "goal_id" UUID,
    "created_by_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "problem_statement" TEXT NOT NULL,
    "hypothesis" TEXT NOT NULL,
    "intervention" TEXT NOT NULL,
    "status" "ExperimentStatus" NOT NULL DEFAULT 'DRAFT',
    "start_date" TIMESTAMPTZ(6) NOT NULL,
    "end_date" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "baseline_summary" JSONB,
    "target_summary" JSONB,
    "result_summary" JSONB,
    "confidence" "ExperimentConfidence",
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tbl_engineering_experiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_experiment_metric" (
    "id" UUID NOT NULL,
    "experiment_id" UUID NOT NULL,
    "metric_name" VARCHAR(100) NOT NULL,
    "metric_key" VARCHAR(100) NOT NULL,
    "metric_type" "MetricType" NOT NULL,
    "unit" VARCHAR(50),
    "direction" "MetricDirection" NOT NULL,
    "baseline_value" DECIMAL(18,6),
    "target_value" DECIMAL(18,6),
    "current_value" DECIMAL(18,6),
    "final_value" DECIMAL(18,6),
    "baseline_period_start" TIMESTAMPTZ(6),
    "baseline_period_end" TIMESTAMPTZ(6),
    "measurement_period_start" TIMESTAMPTZ(6),
    "measurement_period_end" TIMESTAMPTZ(6),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tbl_experiment_metric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_improvement_proof" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "experiment_id" UUID NOT NULL,
    "primary_metric_id" UUID,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "baseline_value" DECIMAL(18,6),
    "final_value" DECIMAL(18,6),
    "target_value" DECIMAL(18,6),
    "improvement_percentage" DECIMAL(10,4),
    "target_achieved" BOOLEAN NOT NULL DEFAULT false,
    "confidence" "ExperimentConfidence",
    "evidence_summary" TEXT,
    "evidence" JSONB,
    "result_summary" TEXT,
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tbl_improvement_proof_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tbl_engineering_experiment_organization_id_status_idx" ON "tbl_engineering_experiment"("organization_id", "status");

-- CreateIndex
CREATE INDEX "tbl_engineering_experiment_organization_id_user_id_idx" ON "tbl_engineering_experiment"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "tbl_engineering_experiment_organization_id_team_id_idx" ON "tbl_engineering_experiment"("organization_id", "team_id");

-- CreateIndex
CREATE INDEX "tbl_engineering_experiment_organization_id_project_id_idx" ON "tbl_engineering_experiment"("organization_id", "project_id");

-- CreateIndex
CREATE INDEX "tbl_engineering_experiment_organization_id_repository_id_idx" ON "tbl_engineering_experiment"("organization_id", "repository_id");

-- CreateIndex
CREATE INDEX "tbl_engineering_experiment_organization_id_start_date_idx" ON "tbl_engineering_experiment"("organization_id", "start_date");

-- CreateIndex
CREATE INDEX "tbl_engineering_experiment_organization_id_created_at_idx" ON "tbl_engineering_experiment"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "tbl_experiment_metric_experiment_id_metric_key_idx" ON "tbl_experiment_metric"("experiment_id", "metric_key");

-- CreateIndex
CREATE INDEX "tbl_experiment_metric_experiment_id_is_primary_idx" ON "tbl_experiment_metric"("experiment_id", "is_primary");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_experiment_metric_experiment_id_metric_key_key" ON "tbl_experiment_metric"("experiment_id", "metric_key");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_improvement_proof_experiment_id_key" ON "tbl_improvement_proof"("experiment_id");

-- CreateIndex
CREATE INDEX "tbl_improvement_proof_organization_id_verification_status_idx" ON "tbl_improvement_proof"("organization_id", "verification_status");

-- CreateIndex
CREATE INDEX "tbl_improvement_proof_organization_id_verified_at_idx" ON "tbl_improvement_proof"("organization_id", "verified_at");

-- CreateIndex
CREATE INDEX "tbl_improvement_proof_experiment_id_idx" ON "tbl_improvement_proof"("experiment_id");

-- AddForeignKey
ALTER TABLE "tbl_engineering_experiment" ADD CONSTRAINT "tbl_engineering_experiment_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_engineering_experiment" ADD CONSTRAINT "tbl_engineering_experiment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "tbl_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_engineering_experiment" ADD CONSTRAINT "tbl_engineering_experiment_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "tbl_team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_engineering_experiment" ADD CONSTRAINT "tbl_engineering_experiment_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "tbl_project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_engineering_experiment" ADD CONSTRAINT "tbl_engineering_experiment_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "tbl_repository"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_engineering_experiment" ADD CONSTRAINT "tbl_engineering_experiment_recommendation_id_fkey" FOREIGN KEY ("recommendation_id") REFERENCES "tbl_improvement_recommendation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_engineering_experiment" ADD CONSTRAINT "tbl_engineering_experiment_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "tbl_improvement_goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_engineering_experiment" ADD CONSTRAINT "tbl_engineering_experiment_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "tbl_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_experiment_metric" ADD CONSTRAINT "tbl_experiment_metric_experiment_id_fkey" FOREIGN KEY ("experiment_id") REFERENCES "tbl_engineering_experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_improvement_proof" ADD CONSTRAINT "tbl_improvement_proof_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_improvement_proof" ADD CONSTRAINT "tbl_improvement_proof_experiment_id_fkey" FOREIGN KEY ("experiment_id") REFERENCES "tbl_engineering_experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_improvement_proof" ADD CONSTRAINT "tbl_improvement_proof_primary_metric_id_fkey" FOREIGN KEY ("primary_metric_id") REFERENCES "tbl_experiment_metric"("id") ON DELETE SET NULL ON UPDATE CASCADE;
