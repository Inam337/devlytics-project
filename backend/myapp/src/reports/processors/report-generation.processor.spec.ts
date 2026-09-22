import type { Job } from 'bullmq';
import type { ReportsService } from '../reports.service';
import { ReportGenerationProcessor } from './report-generation.processor';

describe('ReportGenerationProcessor', () => {
  let reports: { generateExport: jest.Mock };
  let processor: ReportGenerationProcessor;

  beforeEach(() => {
    reports = { generateExport: jest.fn() };
    processor = new ReportGenerationProcessor(
      reports as unknown as ReportsService,
    );
  });

  function job(data: Record<string, unknown>): Job {
    return { data } as unknown as Job;
  }

  it('generates the export identified by the job payload', async () => {
    reports.generateExport.mockResolvedValue(undefined);

    await processor.process(
      job({ organizationId: 'org-1', exportId: 'export-1' }),
    );

    expect(reports.generateExport).toHaveBeenCalledWith('org-1', 'export-1');
  });

  it('rethrows so BullMQ retries instead of silently dropping the export', async () => {
    reports.generateExport.mockRejectedValue(new Error('render failed'));

    await expect(
      processor.process(job({ organizationId: 'org-1', exportId: 'export-1' })),
    ).rejects.toThrow('render failed');
  });
});
