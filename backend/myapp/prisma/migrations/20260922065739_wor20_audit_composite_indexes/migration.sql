-- DropIndex
DROP INDEX "tbl_code_quality_snapshot_repository_id_snapshot_date_idx";

-- CreateIndex
CREATE INDEX "tbl_improvement_recommendation_analysis_run_id_idx" ON "tbl_improvement_recommendation"("analysis_run_id");

-- CreateIndex
CREATE INDEX "tbl_sync_job_organization_id_created_at_idx" ON "tbl_sync_job"("organization_id", "created_at");
