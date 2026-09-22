-- CreateEnum
CREATE TYPE "ReportExportStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('DEVELOPERS', 'TEAMS', 'REPOSITORIES', 'QUALITY', 'RANKINGS', 'IMPROVEMENTS', 'TEAM_AI_ANALYSIS', 'INDIVIDUAL_AI_ANALYSIS');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('PDF', 'CSV');

-- CreateTable
CREATE TABLE "tbl_report_export" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "requested_by_id" UUID,
    "target_user_id" UUID,
    "report_type" "ReportType" NOT NULL,
    "format" "ReportFormat" NOT NULL,
    "status" "ReportExportStatus" NOT NULL DEFAULT 'QUEUED',
    "filters" JSONB,
    "file_name" VARCHAR(255),
    "mime_type" VARCHAR(120),
    "file_bytes" BYTEA,
    "analysis_run_number" INTEGER,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),

    CONSTRAINT "tbl_report_export_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tbl_report_export_organization_id_status_idx" ON "tbl_report_export"("organization_id", "status");

-- CreateIndex
CREATE INDEX "tbl_report_export_organization_id_created_at_idx" ON "tbl_report_export"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "tbl_report_export_organization_id_requested_by_id_idx" ON "tbl_report_export"("organization_id", "requested_by_id");

-- AddForeignKey
ALTER TABLE "tbl_report_export" ADD CONSTRAINT "tbl_report_export_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "tbl_organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_report_export" ADD CONSTRAINT "tbl_report_export_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "tbl_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_report_export" ADD CONSTRAINT "tbl_report_export_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "tbl_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
