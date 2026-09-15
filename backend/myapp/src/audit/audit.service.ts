import { Injectable, Logger } from '@nestjs/common';
import { AuditCategory, Prisma } from '@prisma/client';
import { PaginatedResult } from '../common/dto/pagination.dto';
import { AppException } from '../common/exceptions/app.exception';
import { QueryUtil } from '../common/utils/query.util';
import { PrismaService } from '../database/prisma.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

export interface AuditEntryInput {
  organizationId: string;
  actorId?: string | null;
  category: AuditCategory;
  action: string;
  summary: string;
  entityType?: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

const SORTABLE = ['createdAt', 'category', 'action'] as const;

/**
 * The single writer of tbl_audit_log. Every state-changing action calls
 * `record()` — no module writes audit rows directly, and entries are never
 * updated or deleted once written.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Audit logging must never break the action it describes, so a failure here
   * is logged and swallowed rather than propagated to the caller.
   */
  async record(entry: AuditEntryInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: entry.organizationId,
          actorId: entry.actorId ?? null,
          category: entry.category,
          action: entry.action,
          summary: entry.summary,
          entityType: entry.entityType,
          entityId: entry.entityId,
          beforeValue: toJson(entry.before),
          afterValue: toJson(entry.after),
          reason: entry.reason,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to write audit entry '${entry.action}' for organization ${entry.organizationId}: ${
          (error as Error).message
        }`,
      );
    }
  }

  async findAll(organizationId: string, query: AuditLogQueryDto) {
    const where: Prisma.AuditLogWhereInput = {
      organizationId,
      ...QueryUtil.compact({
        category: query.category,
        actorId: query.actorId,
        entityType: query.entityType,
      }),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { summary: { contains: query.search, mode: 'insensitive' } },
              { action: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: QueryUtil.orderBy(query.sortBy, query.sortOrder, SORTABLE, 'createdAt'),
        skip: query.skip,
        take: query.limit,
        include: {
          actor: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return PaginatedResult.from(items, total, query);
  }

  async findOne(organizationId: string, id: string) {
    const entry = await this.prisma.auditLog.findFirst({
      where: { id, organizationId },
      include: {
        actor: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!entry) throw AppException.notFound('Audit log', id);
    return entry;
  }
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return value as Prisma.InputJsonValue;
}
