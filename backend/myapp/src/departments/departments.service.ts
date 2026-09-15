import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PaginatedResult, PaginationQueryDto } from '../common/dto/pagination.dto';
import { AppException } from '../common/exceptions/app.exception';
import { QueryUtil } from '../common/utils/query.util';
import { PrismaService } from '../database/prisma.service';
import type { ActorContext } from '../organizations/organizations.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

const SORTABLE = ['name', 'code', 'createdAt'] as const;

const DETAIL_INCLUDE = {
  manager: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
  _count: { select: { teams: true } },
} satisfies Prisma.DepartmentInclude;

/**
 * Departments group teams for reporting. They sit between the organization and
 * its teams in the hierarchy described in docs/devlytics.md §2.1.
 */
@Injectable()
export class DepartmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(organizationId: string, query: PaginationQueryDto) {
    const where: Prisma.DepartmentWhereInput = {
      organizationId,
      ...QueryUtil.search(query.search, ['name', 'code']),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.department.findMany({
        where,
        orderBy: QueryUtil.orderBy(query.sortBy, query.sortOrder, SORTABLE, 'name'),
        skip: query.skip,
        take: query.limit,
        include: DETAIL_INCLUDE,
      }),
      this.prisma.department.count({ where }),
    ]);

    return PaginatedResult.from(items.map(toView), total, query);
  }

  async findOne(organizationId: string, id: string) {
    const department = await this.prisma.department.findFirst({
      where: { id, organizationId },
      include: {
        ...DETAIL_INCLUDE,
        teams: {
          select: { id: true, name: true, code: true, teamColor: true, status: true },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!department) throw AppException.notFound('Department', id);
    return { ...toView(department), teams: department.teams };
  }

  async create(organizationId: string, dto: CreateDepartmentDto, actor: ActorContext) {
    await this.assertManagerBelongsToOrg(organizationId, dto.managerId);

    const department = await this.prisma.department.create({
      data: {
        organizationId,
        name: dto.name,
        code: dto.code.toUpperCase(),
        description: dto.description,
        managerId: dto.managerId,
      },
      include: DETAIL_INCLUDE,
    });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'ORGANIZATION',
      action: 'department.created',
      summary: `Department '${department.name}' created`,
      entityType: 'Department',
      entityId: department.id,
      after: { name: department.name, code: department.code, managerId: department.managerId },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toView(department);
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateDepartmentDto,
    actor: ActorContext,
  ) {
    const existing = await this.prisma.department.findFirst({ where: { id, organizationId } });
    if (!existing) throw AppException.notFound('Department', id);
    await this.assertManagerBelongsToOrg(organizationId, dto.managerId);

    const department = await this.prisma.department.update({
      where: { id },
      data: QueryUtil.compact({
        name: dto.name,
        code: dto.code?.toUpperCase(),
        description: dto.description,
        managerId: dto.managerId,
      }),
      include: DETAIL_INCLUDE,
    });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'ORGANIZATION',
      action: 'department.updated',
      summary: `Department '${department.name}' updated`,
      entityType: 'Department',
      entityId: id,
      before: { name: existing.name, code: existing.code, managerId: existing.managerId },
      after: { name: department.name, code: department.code, managerId: department.managerId },
      reason: actor.reason,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return toView(department);
  }

  async remove(organizationId: string, id: string, actor: ActorContext) {
    const department = await this.prisma.department.findFirst({
      where: { id, organizationId },
      include: { _count: { select: { teams: true } } },
    });
    if (!department) throw AppException.notFound('Department', id);
    if (department._count.teams > 0) {
      throw AppException.conflict(
        `Cannot delete '${department.name}' while ${department._count.teams} team(s) still belong to it`,
      );
    }

    await this.prisma.department.delete({ where: { id } });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'ORGANIZATION',
      action: 'department.deleted',
      summary: `Department '${department.name}' deleted`,
      entityType: 'Department',
      entityId: id,
      before: { name: department.name, code: department.code },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return { id, deleted: true };
  }

  /** A manager must be a member of the same organization. */
  private async assertManagerBelongsToOrg(organizationId: string, managerId?: string) {
    if (!managerId) return;
    const membership = await this.prisma.organizationUser.findUnique({
      where: { organizationId_userId: { organizationId, userId: managerId } },
      select: { id: true },
    });
    if (!membership) {
      throw AppException.unprocessable('The nominated manager is not a member of this organization');
    }
  }
}

function toView(department: Prisma.DepartmentGetPayload<{ include: typeof DETAIL_INCLUDE }>) {
  const { _count, ...rest } = department;
  return { ...rest, teamCount: _count.teams };
}
