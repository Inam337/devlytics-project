import { Injectable } from '@nestjs/common';
import { Prisma, Team } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ModelDelegate, TenantRepository } from '../database/tenant.repository';

export const TEAM_INCLUDE = {
  department: { select: { id: true, name: true, code: true } },
  teamLead: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
  _count: { select: { members: true, projectTeams: true, repositories: true } },
} satisfies Prisma.TeamInclude;

export type TeamWithRelations = Prisma.TeamGetPayload<{ include: typeof TEAM_INCLUDE }>;

@Injectable()
export class TeamsRepository extends TenantRepository<Team> {
  constructor(prisma: PrismaService) {
    super(prisma, 'Team');
  }

  protected get delegate(): ModelDelegate {
    return this.prisma.team as unknown as ModelDelegate;
  }

  findByCode(organizationId: string, code: string): Promise<Team | null> {
    return this.prisma.team.findUnique({
      where: { organizationId_code: { organizationId, code } },
    });
  }

  /** Team ids a user belongs to — used for team-scoped authorization. */
  async findTeamIdsForUser(organizationId: string, userId: string): Promise<string[]> {
    const rows = await this.prisma.teamMember.findMany({
      where: { organizationId, userId },
      select: { teamId: true },
    });
    return rows.map((row) => row.teamId);
  }

  /** Member user ids for a team, used by team scoring and reporting. */
  async findMemberIds(organizationId: string, teamId: string): Promise<string[]> {
    const rows = await this.prisma.teamMember.findMany({
      where: { organizationId, teamId },
      select: { userId: true },
    });
    return rows.map((row) => row.userId);
  }
}
