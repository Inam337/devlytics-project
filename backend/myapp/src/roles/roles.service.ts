import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../database/prisma.service';
import type { ActorContext } from '../organizations/organizations.service';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(organizationId: string) {
    const roles = await this.prisma.role.findMany({
      where: { organizationId },
      include: {
        permissions: { include: { permission: { select: { key: true } } } },
        _count: { select: { memberships: true } },
      },
      orderBy: { name: 'asc' },
    });

    return roles.map((role) => ({
      id: role.id,
      key: role.key,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      memberCount: role._count.memberships,
      permissions: role.permissions.map((entry) => entry.permission.key).sort(),
    }));
  }

  async findOne(organizationId: string, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, organizationId },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) throw AppException.notFound('Role', id);
    return {
      id: role.id,
      key: role.key,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissions.map((entry) => entry.permission),
    };
  }

  /**
   * Replaces a role's permission grants. Recorded with before/after scope, as
   * required for every permission change.
   */
  async updatePermissions(
    organizationId: string,
    id: string,
    dto: UpdateRolePermissionsDto,
    actor: ActorContext,
  ) {
    const role = await this.findOne(organizationId, id);
    const before = role.permissions.map((permission) => permission.key).sort();

    const permissions = await this.prisma.permission.findMany({
      where: { key: { in: dto.permissions } },
    });
    const unknown = dto.permissions.filter(
      (key) => !permissions.some((permission) => permission.key === key),
    );
    if (unknown.length > 0) {
      throw AppException.badRequest(`Unknown permission keys: ${unknown.join(', ')}`);
    }

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      this.prisma.rolePermission.createMany({
        data: permissions.map((permission) => ({ roleId: id, permissionId: permission.id })),
        skipDuplicates: true,
      }),
    ]);

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'ROLE',
      action: 'role.permissions_changed',
      summary: `Permission scope for role '${role.name}' updated`,
      entityType: 'Role',
      entityId: id,
      before: { permissions: before },
      after: { permissions: [...dto.permissions].sort() },
      reason: dto.reason ?? actor.reason,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return this.findOne(organizationId, id);
  }
}
