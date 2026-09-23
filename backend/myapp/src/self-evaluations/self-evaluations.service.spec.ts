import { Prisma } from '@prisma/client';
import type { AuditService } from '../audit/audit.service';
import { AppException } from '../common/exceptions/app.exception';
import type { PrismaService } from '../database/prisma.service';
import type { ActorContext } from '../organizations/organizations.service';
import { SelfEvaluationsService } from './self-evaluations.service';

describe('SelfEvaluationsService', () => {
  let prisma: {
    developerScore: { findFirst: jest.Mock };
    selfEvaluation: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let audit: { record: jest.Mock };
  let service: SelfEvaluationsService;

  const actor: ActorContext = { actorId: 'user-1' };

  beforeEach(() => {
    prisma = {
      developerScore: { findFirst: jest.fn().mockResolvedValue(null) },
      selfEvaluation: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new SelfEvaluationsService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
    );
  });

  describe('create', () => {
    it('rejects a period where the start is after the end', async () => {
      await expect(
        service.create(
          'org-1',
          'user-1',
          {
            periodStart: '2026-02-01',
            periodEnd: '2026-01-01',
            items: [{ category: 'DELIVERY', selfRating: 4 }],
          } as never,
          actor,
        ),
      ).rejects.toThrow(AppException);
      expect(prisma.selfEvaluation.create).not.toHaveBeenCalled();
    });

    it('leaves measuredScore undefined per item when there is no overlapping measured score', async () => {
      prisma.developerScore.findFirst.mockResolvedValue(null);
      prisma.selfEvaluation.create.mockResolvedValue({
        id: 'eval-1',
        items: [{ category: 'DELIVERY', selfRating: 4, measuredScore: null }],
      });

      await service.create(
        'org-1',
        'user-1',
        {
          periodStart: '2026-01-01',
          periodEnd: '2026-01-31',
          items: [{ category: 'DELIVERY', selfRating: 4 }],
        } as never,
        actor,
      );

      const data = prisma.selfEvaluation.create.mock.calls[0][0].data;
      expect(data.items.create[0].measuredScore).toBeUndefined();
    });

    it('pairs each item with the measured score for its category when a score overlaps the period', async () => {
      prisma.developerScore.findFirst.mockResolvedValue({
        codeQualityScore: new Prisma.Decimal(70),
        deliveryScore: new Prisma.Decimal(88),
        codeReviewScore: new Prisma.Decimal(0),
        testingScore: new Prisma.Decimal(0),
        reliabilityScore: new Prisma.Decimal(0),
        collaborationScore: new Prisma.Decimal(0),
        documentationScore: new Prisma.Decimal(0),
        projectImpactScore: new Prisma.Decimal(0),
      });
      prisma.selfEvaluation.create.mockResolvedValue({
        id: 'eval-1',
        items: [
          {
            category: 'DELIVERY',
            selfRating: 4,
            measuredScore: new Prisma.Decimal(88),
          },
        ],
      });

      const result = await service.create(
        'org-1',
        'user-1',
        {
          periodStart: '2026-01-01',
          periodEnd: '2026-01-31',
          items: [{ category: 'DELIVERY', selfRating: 4 }],
        } as never,
        actor,
      );

      const data = prisma.selfEvaluation.create.mock.calls[0][0].data;
      expect(
        (data.items.create[0].measuredScore as Prisma.Decimal).toNumber(),
      ).toBe(88);
      expect(result.items[0].measuredScore).toBe(88);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'self_evaluation.created' }),
      );
    });

    it('creates the evaluation in DRAFT status', async () => {
      prisma.selfEvaluation.create.mockResolvedValue({
        id: 'eval-1',
        items: [],
      });

      await service.create(
        'org-1',
        'user-1',
        {
          periodStart: '2026-01-01',
          periodEnd: '2026-01-31',
          items: [{ category: 'DELIVERY', selfRating: 4 }],
        } as never,
        actor,
      );

      expect(prisma.selfEvaluation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'DRAFT' }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('throws not-found for an evaluation outside the organization', async () => {
      prisma.selfEvaluation.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('org-1', 'eval-from-other-org'),
      ).rejects.toThrow(AppException);
    });
  });

  describe('update', () => {
    it('throws not-found for an evaluation outside the organization', async () => {
      prisma.selfEvaluation.findFirst.mockResolvedValue(null);

      await expect(
        service.update(
          'org-1',
          'eval-from-other-org',
          {} as never,
          actor,
          false,
        ),
      ).rejects.toThrow(AppException);
    });

    it('forbids a non-reviewer from setting status REVIEWED', async () => {
      prisma.selfEvaluation.findFirst.mockResolvedValue({
        id: 'eval-1',
        status: 'SUBMITTED',
      });

      await expect(
        service.update(
          'org-1',
          'eval-1',
          { status: 'REVIEWED' } as never,
          actor,
          false,
        ),
      ).rejects.toThrow(AppException);
      expect(prisma.selfEvaluation.update).not.toHaveBeenCalled();
    });

    it('forbids a non-reviewer from touching an already-reviewed evaluation', async () => {
      prisma.selfEvaluation.findFirst.mockResolvedValue({
        id: 'eval-1',
        status: 'REVIEWED',
      });

      await expect(
        service.update(
          'org-1',
          'eval-1',
          { summary: 'edit' } as never,
          actor,
          false,
        ),
      ).rejects.toThrow(AppException);
    });

    it('allows a reviewer to mark it REVIEWED, stamping reviewedAt/reviewerId', async () => {
      prisma.selfEvaluation.findFirst.mockResolvedValue({
        id: 'eval-1',
        status: 'SUBMITTED',
      });
      prisma.selfEvaluation.update.mockResolvedValue({
        id: 'eval-1',
        status: 'REVIEWED',
        items: [],
      });

      await service.update(
        'org-1',
        'eval-1',
        { status: 'REVIEWED', reviewerNotes: 'Great work' } as never,
        actor,
        true,
      );

      expect(prisma.selfEvaluation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'REVIEWED',
            reviewedAt: expect.any(Date),
            reviewerId: 'user-1',
            reviewerNotes: 'Great work',
          }),
        }),
      );
    });

    it('stamps submittedAt when the owner transitions to SUBMITTED', async () => {
      prisma.selfEvaluation.findFirst.mockResolvedValue({
        id: 'eval-1',
        status: 'DRAFT',
      });
      prisma.selfEvaluation.update.mockResolvedValue({
        id: 'eval-1',
        status: 'SUBMITTED',
        items: [],
      });

      await service.update(
        'org-1',
        'eval-1',
        { status: 'SUBMITTED' } as never,
        actor,
        false,
      );

      expect(prisma.selfEvaluation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'SUBMITTED',
            submittedAt: expect.any(Date),
          }),
        }),
      );
    });
  });
});
