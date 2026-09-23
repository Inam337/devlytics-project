import type { ConfigService } from '@nestjs/config';
import type { AuditService } from '../audit/audit.service';
import type { MailService } from '../common/services/mail.service';
import type { PrismaService } from '../database/prisma.service';
import type { NotificationsService } from '../notifications/notifications.service';
import { GoalsService } from './goals.service';

describe('GoalsService#sweepAtRisk (WOR-11)', () => {
  let prisma: {
    improvementGoal: { findMany: jest.Mock; update: jest.Mock };
  };
  let service: GoalsService;

  beforeEach(() => {
    prisma = {
      improvementGoal: { findMany: jest.fn(), update: jest.fn() },
    };

    service = new GoalsService(
      prisma as unknown as PrismaService,
      {} as unknown as AuditService,
      {} as unknown as NotificationsService,
      { get: jest.fn().mockReturnValue(14) } as unknown as ConfigService,
      { sendTemplate: jest.fn() } as unknown as MailService,
    );
  });

  it('queries only ACTIVE goals whose movement (or creation, if never measured) predates the cutoff', async () => {
    prisma.improvementGoal.findMany.mockResolvedValue([]);

    await service.sweepAtRisk('org-1', 14);

    expect(prisma.improvementGoal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org-1',
          status: 'ACTIVE',
          OR: [
            { lastMovementAt: { lt: expect.any(Date) } },
            { lastMovementAt: null, createdAt: { lt: expect.any(Date) } },
          ],
        }),
      }),
    );
  });

  it('flags every matching goal as AT_RISK and returns their ids', async () => {
    prisma.improvementGoal.findMany.mockResolvedValue([
      { id: 'goal-1' },
      { id: 'goal-2' },
    ]);

    const flagged = await service.sweepAtRisk('org-1', 14);

    expect(prisma.improvementGoal.update).toHaveBeenCalledWith({
      where: { id: 'goal-1' },
      data: { status: 'AT_RISK' },
    });
    expect(prisma.improvementGoal.update).toHaveBeenCalledWith({
      where: { id: 'goal-2' },
      data: { status: 'AT_RISK' },
    });
    expect(flagged).toEqual(['goal-1', 'goal-2']);
  });

  it('does nothing when no goal crosses the threshold', async () => {
    prisma.improvementGoal.findMany.mockResolvedValue([]);

    const flagged = await service.sweepAtRisk('org-1', 14);

    expect(prisma.improvementGoal.update).not.toHaveBeenCalled();
    expect(flagged).toEqual([]);
  });
});
