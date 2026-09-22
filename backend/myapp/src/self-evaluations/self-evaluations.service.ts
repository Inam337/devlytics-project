import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PaginatedResult } from '../common/dto/pagination.dto';
import { AppException } from '../common/exceptions/app.exception';
import { NumberUtil } from '../common/utils/number.util';
import { QueryUtil } from '../common/utils/query.util';
import { PrismaService } from '../database/prisma.service';
import type { ActorContext } from '../organizations/organizations.service';
import {
  CreateSelfEvaluationDto,
  SelfEvaluationQueryDto,
  UpdateSelfEvaluationDto,
} from './dto/self-evaluation.dto';

/**
 * Self-evaluations pair a developer's own rating with the measured score in
 * the same category (`tbl_developer_score`), so the comparison is explicit
 * rather than left to the reader to reconstruct.
 */
@Injectable()
export class SelfEvaluationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    organizationId: string,
    userId: string,
    dto: CreateSelfEvaluationDto,
    actor: ActorContext,
  ) {
    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);
    if (periodStart > periodEnd) {
      throw AppException.badRequest(
        'periodStart must be on or before periodEnd',
      );
    }

    const measured = await this.prisma.developerScore.findFirst({
      where: {
        organizationId,
        userId,
        periodStart: { lte: periodEnd },
        periodEnd: { gte: periodStart },
      },
      orderBy: { computedAt: 'desc' },
    });

    const evaluation = await this.prisma.selfEvaluation.create({
      data: {
        organizationId,
        userId,
        repositoryId: dto.repositoryId,
        projectId: dto.projectId,
        period: dto.period ?? 'MONTHLY',
        periodStart,
        periodEnd,
        summary: dto.summary,
        overallRating: dto.overallRating,
        status: 'DRAFT',
        items: {
          create: dto.items.map((item) => ({
            category: item.category,
            selfRating: item.selfRating,
            comment: item.comment,
            measuredScore: measured
              ? new Prisma.Decimal(scoreForCategory(measured, item.category))
              : undefined,
          })),
        },
      },
      include: { items: true },
    });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'USER',
      action: 'self_evaluation.created',
      summary: 'Self-evaluation drafted',
      entityType: 'SelfEvaluation',
      entityId: evaluation.id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toView(evaluation);
  }

  async findAll(
    organizationId: string,
    query: SelfEvaluationQueryDto,
    scopeToUserId?: string,
  ) {
    const where: Prisma.SelfEvaluationWhereInput = {
      organizationId,
      ...(scopeToUserId
        ? { userId: scopeToUserId }
        : QueryUtil.compact({ userId: query.userId })),
      ...QueryUtil.compact({ status: query.status }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.selfEvaluation.findMany({
        where,
        orderBy: { periodStart: 'desc' },
        skip: query.skip,
        take: query.limit,
        include: {
          items: true,
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.selfEvaluation.count({ where }),
    ]);

    return PaginatedResult.from(items.map(toView), total, query);
  }

  async findOne(organizationId: string, id: string) {
    const evaluation = await this.prisma.selfEvaluation.findFirst({
      where: { id, organizationId },
      include: {
        items: true,
        user: { select: { id: true, firstName: true, lastName: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!evaluation) throw AppException.notFound('Self evaluation', id);
    return toView(evaluation);
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateSelfEvaluationDto,
    actor: ActorContext,
    isReviewer: boolean,
  ) {
    const existing = await this.prisma.selfEvaluation.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw AppException.notFound('Self evaluation', id);

    if (dto.status === 'REVIEWED' && !isReviewer) {
      throw AppException.forbidden(
        'Only a reviewer can mark a self-evaluation reviewed',
      );
    }
    if (existing.status === 'REVIEWED' && !isReviewer) {
      throw AppException.forbidden(
        'This self-evaluation has already been reviewed',
      );
    }

    const updated = await this.prisma.selfEvaluation.update({
      where: { id },
      data: {
        ...QueryUtil.compact({
          summary: dto.summary,
          overallRating: dto.overallRating,
        }),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.status === 'SUBMITTED' ? { submittedAt: new Date() } : {}),
        ...(dto.status === 'REVIEWED'
          ? {
              reviewedAt: new Date(),
              reviewerId: actor.actorId,
              reviewerNotes: dto.reviewerNotes,
            }
          : {}),
      },
      include: { items: true },
    });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'USER',
      action: 'self_evaluation.updated',
      summary: `Self-evaluation ${dto.status ? `set to ${dto.status}` : 'updated'}`,
      entityType: 'SelfEvaluation',
      entityId: id,
      before: { status: existing.status },
      after: { status: updated.status },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toView(updated);
  }
}

function scoreForCategory(
  score: {
    codeQualityScore: Prisma.Decimal;
    deliveryScore: Prisma.Decimal;
    codeReviewScore: Prisma.Decimal;
    testingScore: Prisma.Decimal;
    reliabilityScore: Prisma.Decimal;
    collaborationScore: Prisma.Decimal;
    documentationScore: Prisma.Decimal;
    projectImpactScore: Prisma.Decimal;
  },
  category: string,
): number {
  const map: Record<string, Prisma.Decimal> = {
    CODE_QUALITY: score.codeQualityScore,
    DELIVERY: score.deliveryScore,
    CODE_REVIEW: score.codeReviewScore,
    TESTING: score.testingScore,
    RELIABILITY: score.reliabilityScore,
    COLLABORATION: score.collaborationScore,
    DOCUMENTATION: score.documentationScore,
    PROJECT_IMPACT: score.projectImpactScore,
  };
  return NumberUtil.toNumber(map[category]);
}

function toView(evaluation: {
  items: { measuredScore: Prisma.Decimal | null; [key: string]: unknown }[];
  [key: string]: unknown;
}) {
  return {
    ...evaluation,
    items: evaluation.items.map((item) => ({
      ...item,
      measuredScore:
        item.measuredScore !== null
          ? NumberUtil.toNumber(item.measuredScore)
          : null,
    })),
  };
}
