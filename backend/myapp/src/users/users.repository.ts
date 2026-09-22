import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PaginatedResult } from '../common/dto/pagination.dto';
import { PrismaService } from '../database/prisma.service';
import { UserQueryDto } from './dto/user-query.dto';

/** The membership row plus everything a caller needs to authorize a request. */
export const MEMBERSHIP_INCLUDE = {
  user: true,
  role: { include: { permissions: { include: { permission: true } } } },
} satisfies Prisma.OrganizationUserInclude;

export type MembershipWithRelations = Prisma.OrganizationUserGetPayload<{
  include: typeof MEMBERSHIP_INCLUDE;
}>;

const SORTABLE_COLUMNS = ['createdAt', 'joinedAt', 'status'] as const;

/**
 * Data access for tbl_user and tbl_organization_user.
 *
 * A `User` is a global identity (one person, one login) while membership is
 * organization-scoped. Every organization-facing read therefore goes through
 * the membership table, which carries the tenant boundary.
 */
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  /** Resolves the caller's membership, role and effective permissions in one query. */
  findMembership(
    organizationId: string,
    userId: string,
  ): Promise<MembershipWithRelations | null> {
    return this.prisma.organizationUser.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      include: MEMBERSHIP_INCLUDE,
    });
  }

  /** The membership used to issue a token when the caller did not name an organization. */
  findPrimaryMembership(
    userId: string,
  ): Promise<MembershipWithRelations | null> {
    return this.prisma.organizationUser.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'INVITED'] } },
      include: MEMBERSHIP_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  async paginateMembers(organizationId: string, query: UserQueryDto) {
    const where: Prisma.OrganizationUserWhereInput = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.roleKey ? { role: { key: query.roleKey } } : {}),
      ...(query.teamId
        ? { user: { teamMemberships: { some: { teamId: query.teamId } } } }
        : {}),
      ...(query.search
        ? {
            user: {
              OR: [
                { firstName: { contains: query.search, mode: 'insensitive' } },
                { lastName: { contains: query.search, mode: 'insensitive' } },
                { email: { contains: query.search, mode: 'insensitive' } },
                { jobTitle: { contains: query.search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };

    const orderBy: Prisma.OrganizationUserOrderByWithRelationInput =
      SORTABLE_COLUMNS.includes(
        query.sortBy as (typeof SORTABLE_COLUMNS)[number],
      )
        ? ({
            [query.sortBy as string]: query.sortOrder,
          } as Prisma.OrganizationUserOrderByWithRelationInput)
        : { user: { firstName: query.sortOrder } };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.organizationUser.findMany({
        where,
        orderBy,
        skip: query.skip,
        take: query.limit,
        include: {
          user: true,
          role: { select: { id: true, key: true, name: true } },
        },
      }),
      this.prisma.organizationUser.count({ where }),
    ]);

    return PaginatedResult.from(items, total, query);
  }

  createUser(data: Prisma.UserCreateInput, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).user.create({ data });
  }

  updateUser(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({ where: { id }, data });
  }

  createMembership(
    data: Prisma.OrganizationUserUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).organizationUser.create({ data });
  }

  updateMembership(id: string, data: Prisma.OrganizationUserUpdateInput) {
    return this.prisma.organizationUser.update({ where: { id }, data });
  }

  /** Distinct developer ids that produced measurable activity in a window. */
  async findActiveDeveloperIds(
    organizationId: string,
    start: Date,
    end: Date,
  ): Promise<string[]> {
    const rows = await this.prisma.developerDailyMetric.findMany({
      where: { organizationId, metricDate: { gte: start, lte: end } },
      select: { userId: true },
      distinct: ['userId'],
    });
    return rows.map((row) => row.userId);
  }
}
