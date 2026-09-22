import { Injectable } from '@nestjs/common';
import { Organization, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

/**
 * Data access for tbl_organization. The organization is the tenant root, so it
 * is the one resource not scoped by `organizationId` — access is instead
 * limited to the organizations the caller is a member of.
 */
@Injectable()
export class OrganizationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({ where: { id } });
  }

  findBySlug(slug: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({ where: { slug } });
  }

  /** Only the organizations this user actually belongs to. */
  findForUser(userId: string): Promise<Organization[]> {
    return this.prisma.organization.findMany({
      where: {
        members: { some: { userId, status: { in: ['ACTIVE', 'INVITED'] } } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  create(data: Prisma.OrganizationCreateInput, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).organization.create({ data });
  }

  update(id: string, data: Prisma.OrganizationUpdateInput) {
    return this.prisma.organization.update({ where: { id }, data });
  }

  /** Header counts shown on the organization detail screen. */
  async counts(id: string) {
    const [users, departments, teams, projects, repositories] =
      await this.prisma.$transaction([
        this.prisma.organizationUser.count({
          where: { organizationId: id, status: 'ACTIVE' },
        }),
        this.prisma.department.count({ where: { organizationId: id } }),
        this.prisma.team.count({
          where: { organizationId: id, status: 'ACTIVE' },
        }),
        this.prisma.project.count({ where: { organizationId: id } }),
        this.prisma.repository.count({ where: { organizationId: id } }),
      ]);
    return { users, departments, teams, projects, repositories };
  }
}
