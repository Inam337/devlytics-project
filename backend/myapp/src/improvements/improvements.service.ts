import { Injectable } from '@nestjs/common';
import { Prisma, RecommendationStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PaginatedResult, PaginationQueryDto } from '../common/dto/pagination.dto';
import { AppException } from '../common/exceptions/app.exception';
import { NumberUtil } from '../common/utils/number.util';
import { QueryUtil } from '../common/utils/query.util';
import { PrismaService } from '../database/prisma.service';
import type { ActorContext } from '../organizations/organizations.service';
import { UpdateRecommendationDto } from './dto/improvements.dto';

const SORTABLE = ['priority', 'createdAt', 'status'] as const;

/**
 * Read/update side of `tbl_improvement_recommendation`. Recommendations are
 * produced by `AiAnalysisService` — this module never creates one, it only
 * lists them and lets a lead accept/reject/implement, and converts one into a
 * goal.
 */
@Injectable()
export class ImprovementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(
    organizationId: string,
    query: PaginationQueryDto & { status?: RecommendationStatus; category?: string },
  ) {
    const where: Prisma.ImprovementRecommendationWhereInput = {
      organizationId,
      ...QueryUtil.compact({
        status: query.status,
        category: query.category as Prisma.ImprovementRecommendationWhereInput['category'],
      }),
      ...QueryUtil.search(query.search, ['title', 'recommendation']),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.improvementRecommendation.findMany({
        where,
        orderBy: QueryUtil.orderBy(query.sortBy, query.sortOrder, SORTABLE, 'priority'),
        skip: query.skip,
        take: query.limit,
        include: {
          qualityIssue: {
            select: { id: true, title: true, observedFact: true, severity: true, repositoryId: true },
          },
        },
      }),
      this.prisma.improvementRecommendation.count({ where }),
    ]);

    return PaginatedResult.from(items.map(toView), total, query);
  }

  async findOne(organizationId: string, id: string) {
    const recommendation = await this.prisma.improvementRecommendation.findFirst({
      where: { id, organizationId },
      include: {
        qualityIssue: true,
        goals: { select: { id: true, status: true, title: true } },
      },
    });
    if (!recommendation) throw AppException.notFound('Recommendation', id);
    return toView(recommendation);
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateRecommendationDto,
    actor: ActorContext,
  ) {
    const existing = await this.prisma.improvementRecommendation.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw AppException.notFound('Recommendation', id);

    const updated = await this.prisma.improvementRecommendation.update({
      where: { id },
      data: { status: dto.status },
    });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'AI',
      action: 'recommendation.status_changed',
      summary: `Recommendation '${existing.title}' set to ${dto.status}`,
      entityType: 'ImprovementRecommendation',
      entityId: id,
      before: { status: existing.status },
      after: { status: dto.status },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toView(updated);
  }
}

function toView(recommendation: Prisma.ImprovementRecommendationGetPayload<Record<string, never>>) {
  return {
    ...recommendation,
    aiConfidence: recommendation.aiConfidence ? NumberUtil.toNumber(recommendation.aiConfidence) : null,
  };
}
