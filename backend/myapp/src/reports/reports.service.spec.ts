import type { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import type { MailService } from '../common/services/mail.service';
import type { PrismaService } from '../database/prisma.service';
import type { MetricsAggregationService } from '../metrics/metrics-aggregation.service';
import { ExportActor, ReportsService } from './reports.service';

describe('ReportsService — async exports (WOR-7)', () => {
  let prisma: {
    reportExport: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
    team: { findFirst: jest.Mock };
    user: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let metrics: MetricsAggregationService;
  let queue: { add: jest.Mock };
  let mail: { sendTemplate: jest.Mock };
  let service: ReportsService;

  const developer: ExportActor = { userId: 'user-1', roleKey: 'DEVELOPER' };
  const admin: ExportActor = {
    userId: 'admin-1',
    roleKey: 'ORGANIZATION_ADMIN',
  };
  const peer: ExportActor = { userId: 'peer-1', roleKey: 'DEVELOPER' };
  const teamLead: ExportActor = { userId: 'lead-1', roleKey: 'TEAM_LEAD' };

  beforeEach(() => {
    prisma = {
      reportExport: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      team: { findFirst: jest.fn() },
      user: { findUnique: jest.fn() },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    metrics = {} as MetricsAggregationService;
    queue = { add: jest.fn().mockResolvedValue({}) };
    mail = { sendTemplate: jest.fn().mockResolvedValue({ success: true }) };

    service = new ReportsService(
      prisma as unknown as PrismaService,
      metrics,
      queue as unknown as Queue,
      mail as unknown as MailService,
      {
        get: jest.fn().mockReturnValue('http://localhost:3000'),
      } as unknown as ConfigService,
    );
  });

  describe('requestExport', () => {
    it('creates a QUEUED row and enqueues the generation job', async () => {
      prisma.reportExport.create.mockResolvedValue({
        id: 'export-1',
        status: 'QUEUED',
      });

      const result = await service.requestExport(
        'org-1',
        { reportType: 'DEVELOPERS', format: 'PDF' },
        developer,
      );

      expect(prisma.reportExport.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 'org-1',
            requestedById: 'user-1',
            reportType: 'DEVELOPERS',
            format: 'PDF',
          }),
        }),
      );
      expect(queue.add).toHaveBeenCalledWith(
        'generate-export',
        expect.objectContaining({
          organizationId: 'org-1',
          requestedBy: 'user-1',
          exportId: 'export-1',
        }),
        expect.objectContaining({ jobId: 'export-1' }),
      );
      expect(result).toEqual({
        id: 'export-1',
        status: 'QUEUED',
        queued: true,
      });
    });

    it('rejects an INDIVIDUAL_AI_ANALYSIS request with no targetUserId', async () => {
      await expect(
        service.requestExport(
          'org-1',
          { reportType: 'INDIVIDUAL_AI_ANALYSIS', format: 'PDF' },
          developer,
        ),
      ).rejects.toThrow(/targetUserId is required/);
      expect(prisma.reportExport.create).not.toHaveBeenCalled();
    });

    it('allows a developer to request their own INDIVIDUAL_AI_ANALYSIS export', async () => {
      prisma.reportExport.create.mockResolvedValue({
        id: 'export-2',
        status: 'QUEUED',
      });

      await service.requestExport(
        'org-1',
        {
          reportType: 'INDIVIDUAL_AI_ANALYSIS',
          format: 'PDF',
          targetUserId: developer.userId,
        },
        developer,
      );

      expect(prisma.reportExport.create).toHaveBeenCalled();
    });

    it('allows an organization admin to request an INDIVIDUAL_AI_ANALYSIS export for anyone', async () => {
      prisma.reportExport.create.mockResolvedValue({
        id: 'export-3',
        status: 'QUEUED',
      });

      await service.requestExport(
        'org-1',
        {
          reportType: 'INDIVIDUAL_AI_ANALYSIS',
          format: 'PDF',
          targetUserId: 'someone-else',
        },
        admin,
      );

      expect(prisma.reportExport.create).toHaveBeenCalled();
    });

    it("allows the target's team lead to request an INDIVIDUAL_AI_ANALYSIS export", async () => {
      prisma.team.findFirst.mockResolvedValue({ id: 'team-1' });
      prisma.reportExport.create.mockResolvedValue({
        id: 'export-4',
        status: 'QUEUED',
      });

      await service.requestExport(
        'org-1',
        {
          reportType: 'INDIVIDUAL_AI_ANALYSIS',
          format: 'PDF',
          targetUserId: 'member-1',
        },
        teamLead,
      );

      expect(prisma.team.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-1',
            teamLeadId: teamLead.userId,
            members: { some: { userId: 'member-1' } },
          }),
        }),
      );
      expect(prisma.reportExport.create).toHaveBeenCalled();
    });

    it('rejects a peer developer requesting another developer’s INDIVIDUAL_AI_ANALYSIS export', async () => {
      prisma.team.findFirst.mockResolvedValue(null);

      await expect(
        service.requestExport(
          'org-1',
          {
            reportType: 'INDIVIDUAL_AI_ANALYSIS',
            format: 'PDF',
            targetUserId: 'someone-else',
          },
          peer,
        ),
      ).rejects.toThrow(/Only the developer|access this report/);
      expect(prisma.reportExport.create).not.toHaveBeenCalled();
    });
  });

  describe('getExportStatus / downloadExport access control', () => {
    it('allows the requester to read their own export status', async () => {
      prisma.reportExport.findFirst.mockResolvedValue({
        id: 'export-1',
        organizationId: 'org-1',
        requestedById: developer.userId,
        reportType: 'DEVELOPERS',
        targetUserId: null,
        status: 'COMPLETED',
      });

      const result = await service.getExportStatus(
        'org-1',
        'export-1',
        developer,
      );
      expect(result.id).toBe('export-1');
    });

    it('rejects a peer reading a DEVELOPERS export they did not request', async () => {
      prisma.reportExport.findFirst.mockResolvedValue({
        id: 'export-1',
        organizationId: 'org-1',
        requestedById: developer.userId,
        reportType: 'DEVELOPERS',
        targetUserId: null,
        status: 'COMPLETED',
      });

      await expect(
        service.getExportStatus('org-1', 'export-1', peer),
      ).rejects.toThrow(/do not have access/);
    });

    it('rejects downloading a report export that has not finished', async () => {
      prisma.reportExport.findFirst.mockResolvedValue({
        id: 'export-1',
        organizationId: 'org-1',
        requestedById: developer.userId,
        reportType: 'DEVELOPERS',
        targetUserId: null,
        status: 'RUNNING',
        fileBytes: null,
      });

      await expect(
        service.downloadExport('org-1', 'export-1', developer),
      ).rejects.toThrow(/not ready for download/);
    });

    it('rejects a peer downloading an INDIVIDUAL_AI_ANALYSIS export for someone else', async () => {
      prisma.reportExport.findFirst.mockResolvedValue({
        id: 'export-5',
        organizationId: 'org-1',
        requestedById: admin.userId,
        reportType: 'INDIVIDUAL_AI_ANALYSIS',
        targetUserId: 'someone-else',
        status: 'COMPLETED',
        fileBytes: Buffer.from('pdf'),
        fileName: 'report.pdf',
        mimeType: 'application/pdf',
      });
      prisma.team.findFirst.mockResolvedValue(null);

      await expect(
        service.downloadExport('org-1', 'export-5', peer),
      ).rejects.toThrow(/access this report/);
    });

    it('allows the target developer to download their own completed INDIVIDUAL_AI_ANALYSIS export', async () => {
      prisma.reportExport.findFirst.mockResolvedValue({
        id: 'export-6',
        organizationId: 'org-1',
        requestedById: admin.userId,
        reportType: 'INDIVIDUAL_AI_ANALYSIS',
        targetUserId: developer.userId,
        status: 'COMPLETED',
        fileBytes: Buffer.from('pdf-bytes'),
        fileName: 'report.pdf',
        mimeType: 'application/pdf',
      });

      const result = await service.downloadExport(
        'org-1',
        'export-6',
        developer,
      );
      expect(result.fileName).toBe('report.pdf');
      expect(result.buffer.toString()).toBe('pdf-bytes');
    });
  });

  describe('generateExport', () => {
    it('dispatches to the matching builder, marks COMPLETED and stores the buffer', async () => {
      prisma.reportExport.findFirst.mockResolvedValue({
        id: 'export-1',
        organizationId: 'org-1',
        reportType: 'DEVELOPERS',
        format: 'PDF',
        targetUserId: null,
        filters: { teamId: 'team-9' },
      });
      const buffer = Buffer.from('pdf-report');
      jest.spyOn(service, 'developers').mockResolvedValue({
        format: 'pdf',
        title: 'Developer Performance Report',
        scope: 'all time',
        columns: [],
        rows: [],
        buffer,
      });

      await service.generateExport('org-1', 'export-1');

      expect(service.developers).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({ teamId: 'team-9', format: 'pdf' }),
      );
      expect(prisma.reportExport.update).toHaveBeenCalledWith({
        where: { id: 'export-1' },
        data: { status: 'RUNNING' },
      });
      expect(prisma.reportExport.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'export-1' },
          data: expect.objectContaining({
            status: 'COMPLETED',
            fileName: 'developer-performance-report.pdf',
            mimeType: 'application/pdf',
            analysisRunNumber: undefined,
          }),
        }),
      );
    });

    it('marks FAILED and rethrows when the builder throws', async () => {
      prisma.reportExport.findFirst.mockResolvedValue({
        id: 'export-2',
        organizationId: 'org-1',
        reportType: 'TEAMS',
        format: 'CSV',
        targetUserId: null,
        filters: {},
      });
      jest
        .spyOn(service, 'teams')
        .mockRejectedValue(new Error('db unavailable'));

      await expect(service.generateExport('org-1', 'export-2')).rejects.toThrow(
        'db unavailable',
      );

      expect(prisma.reportExport.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'export-2' },
          data: expect.objectContaining({
            status: 'FAILED',
            errorMessage: 'db unavailable',
          }),
        }),
      );
    });

    it('requires targetUserId to be set on the row for an INDIVIDUAL_AI_ANALYSIS export', async () => {
      prisma.reportExport.findFirst.mockResolvedValue({
        id: 'export-3',
        organizationId: 'org-1',
        reportType: 'INDIVIDUAL_AI_ANALYSIS',
        format: 'PDF',
        targetUserId: null,
        filters: {},
      });

      await expect(service.generateExport('org-1', 'export-3')).rejects.toThrow(
        /targetUserId is required/,
      );
    });

    it('emails only the target developer and their team lead for a completed INDIVIDUAL_AI_ANALYSIS PDF export — never a peer team member', async () => {
      prisma.reportExport.findFirst.mockResolvedValue({
        id: 'export-7',
        organizationId: 'org-1',
        reportType: 'INDIVIDUAL_AI_ANALYSIS',
        format: 'PDF',
        targetUserId: 'dev-1',
        filters: {},
      });
      jest.spyOn(service, 'individualAiAnalysis').mockResolvedValue({
        format: 'pdf',
        title: 'Individual AI Analysis — Dana Dev',
        scope: 'all time',
        columns: [],
        rows: [],
        analysisRunNumber: 7,
        buffer: Buffer.from('pdf-bytes'),
      });
      prisma.user.findUnique.mockResolvedValue({
        email: 'dev-1@example.com',
        firstName: 'Dana',
        lastName: 'Dev',
      });
      // A team of 3+ members with a lead — proves the fan-out is scoped to
      // the target + lead only, not every member of the team.
      prisma.team.findFirst.mockResolvedValue({
        teamLead: { email: 'lead-1@example.com', firstName: 'Lea' },
      });

      await service.generateExport('org-1', 'export-7');

      expect(mail.sendTemplate).toHaveBeenCalledTimes(2);
      const recipients = mail.sendTemplate.mock.calls.map((call) => call[0]);
      expect(recipients).toContain('dev-1@example.com');
      expect(recipients).toContain('lead-1@example.com');
      expect(recipients).not.toContain('peer-1@example.com');
      expect(recipients).not.toContain('peer-2@example.com');

      const leadCall = mail.sendTemplate.mock.calls.find(
        (call) => call[0] === 'lead-1@example.com',
      );
      expect(leadCall?.[1]).toEqual(
        expect.objectContaining({
          attachments: [
            expect.objectContaining({
              filename: expect.stringContaining('.pdf'),
              content: Buffer.from('pdf-bytes'),
              contentType: 'application/pdf',
            }),
          ],
        }),
      );
    });

    it('does not email anyone when an INDIVIDUAL_AI_ANALYSIS target has no team (and therefore no lead)', async () => {
      prisma.reportExport.findFirst.mockResolvedValue({
        id: 'export-8',
        organizationId: 'org-1',
        reportType: 'INDIVIDUAL_AI_ANALYSIS',
        format: 'PDF',
        targetUserId: 'dev-1',
        filters: {},
      });
      jest.spyOn(service, 'individualAiAnalysis').mockResolvedValue({
        format: 'pdf',
        title: 'Individual AI Analysis — Dana Dev',
        scope: 'all time',
        columns: [],
        rows: [],
        buffer: Buffer.from('pdf-bytes'),
      });
      prisma.user.findUnique.mockResolvedValue({
        email: 'dev-1@example.com',
        firstName: 'Dana',
        lastName: 'Dev',
      });
      prisma.team.findFirst.mockResolvedValue(null);

      await service.generateExport('org-1', 'export-8');

      expect(mail.sendTemplate).toHaveBeenCalledTimes(1);
      expect(mail.sendTemplate).toHaveBeenCalledWith(
        'dev-1@example.com',
        expect.anything(),
      );
    });
  });
});
