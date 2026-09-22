import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PaginatedResult } from '../common/dto/pagination.dto';
import { AppException } from '../common/exceptions/app.exception';
import { assignedToProjectMail } from '../common/mail-templates/transactional.templates';
import { MailService } from '../common/services/mail.service';
import { NumberUtil } from '../common/utils/number.util';
import { QueryUtil } from '../common/utils/query.util';
import { PrismaService } from '../database/prisma.service';
import { NotificationEvent } from '../notifications/notification-events';
import { NotificationsService } from '../notifications/notifications.service';
import type { ActorContext } from '../organizations/organizations.service';
import {
  AddProjectMemberDto,
  CreateProjectDto,
  ProjectQueryDto,
  UpdateProjectDto,
} from './dto/project.dto';

const SORTABLE = [
  'name',
  'code',
  'status',
  'createdAt',
  'progressPercent',
] as const;

const LIST_INCLUDE = {
  owner: {
    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
  },
  teams: {
    include: {
      team: { select: { id: true, name: true, code: true, teamColor: true } },
    },
  },
  _count: { select: { members: true, repositories: true } },
} satisfies Prisma.ProjectInclude;

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async findAll(organizationId: string, query: ProjectQueryDto) {
    const where: Prisma.ProjectWhereInput = {
      organizationId,
      ...QueryUtil.compact({ status: query.status, ownerId: query.ownerId }),
      ...(query.teamId ? { teams: { some: { teamId: query.teamId } } } : {}),
      ...QueryUtil.search(query.search, ['name', 'code', 'projectKey']),
    };

    const [projects, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        orderBy: QueryUtil.orderBy(
          query.sortBy,
          query.sortOrder,
          SORTABLE,
          'name',
        ),
        skip: query.skip,
        take: query.limit,
        include: LIST_INCLUDE,
      }),
      this.prisma.project.count({ where }),
    ]);

    const scored = await this.attachQualityScores(
      organizationId,
      projects.map((project) => project.id),
    );

    return PaginatedResult.from(
      projects.map((project) => toView(project, scored.get(project.id))),
      total,
      query,
    );
  }

  async findOne(organizationId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, organizationId },
      include: {
        ...LIST_INCLUDE,
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        repositories: {
          select: {
            id: true,
            name: true,
            fullName: true,
            language: true,
            syncStatus: true,
            lastSyncAt: true,
          },
        },
      },
    });
    if (!project) throw AppException.notFound('Project', id);

    const scored = await this.attachQualityScores(organizationId, [id]);

    return {
      ...toView(project, scored.get(id)),
      members: project.members.map((member) => ({
        ...member.user,
        roleLabel: member.roleLabel,
        allocationPercent: member.allocationPercent,
      })),
      repositories: project.repositories,
    };
  }

  async create(
    organizationId: string,
    dto: CreateProjectDto,
    actor: ActorContext,
  ) {
    const code = dto.code.toUpperCase();
    const clash = await this.prisma.project.findUnique({
      where: { organizationId_code: { organizationId, code } },
    });
    if (clash) throw AppException.duplicate('Project', 'code');

    assertDateOrder(dto.startDate, dto.endDate);
    if (dto.ownerId) await this.assertMember(organizationId, dto.ownerId);
    await this.assertTeams(organizationId, dto.teamIds);

    const project = await this.prisma.project.create({
      data: {
        organizationId,
        name: dto.name,
        code,
        projectKey: dto.projectKey?.toUpperCase(),
        description: dto.description,
        status: dto.status ?? 'ACTIVE',
        ownerId: dto.ownerId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        progressPercent: new Prisma.Decimal(dto.progressPercent ?? 0),
        teams: dto.teamIds?.length
          ? {
              create: dto.teamIds.map((teamId, index) => ({
                organizationId,
                teamId,
                isPrimary: index === 0,
              })),
            }
          : undefined,
      },
    });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'PROJECT',
      action: 'project.created',
      summary: `Project '${project.name}' (${project.code}) created`,
      entityType: 'Project',
      entityId: project.id,
      after: { name: project.name, code: project.code, status: project.status },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return this.findOne(organizationId, project.id);
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateProjectDto,
    actor: ActorContext,
  ) {
    const existing = await this.prisma.project.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw AppException.notFound('Project', id);

    const code = dto.code?.toUpperCase();
    if (code && code !== existing.code) {
      const clash = await this.prisma.project.findUnique({
        where: { organizationId_code: { organizationId, code } },
      });
      if (clash) throw AppException.duplicate('Project', 'code');
    }

    assertDateOrder(
      dto.startDate ?? existing.startDate?.toISOString(),
      dto.endDate ?? existing.endDate?.toISOString(),
    );
    if (dto.ownerId) await this.assertMember(organizationId, dto.ownerId);
    await this.assertTeams(organizationId, dto.teamIds);

    await this.prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id },
        data: {
          ...QueryUtil.compact({
            name: dto.name,
            code,
            projectKey: dto.projectKey?.toUpperCase(),
            description: dto.description,
            status: dto.status,
            ownerId: dto.ownerId,
          }),
          ...(dto.startDate ? { startDate: new Date(dto.startDate) } : {}),
          ...(dto.endDate ? { endDate: new Date(dto.endDate) } : {}),
          ...(dto.progressPercent !== undefined
            ? { progressPercent: new Prisma.Decimal(dto.progressPercent) }
            : {}),
        },
      });

      if (dto.teamIds) {
        await tx.projectTeam.deleteMany({ where: { projectId: id } });
        if (dto.teamIds.length > 0) {
          await tx.projectTeam.createMany({
            data: dto.teamIds.map((teamId, index) => ({
              organizationId,
              projectId: id,
              teamId,
              isPrimary: index === 0,
            })),
          });
        }
      }
    });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'PROJECT',
      action: 'project.updated',
      summary: `Project '${existing.name}' updated`,
      entityType: 'Project',
      entityId: id,
      before: {
        name: existing.name,
        status: existing.status,
        ownerId: existing.ownerId,
      },
      after: QueryUtil.compact({
        name: dto.name,
        status: dto.status,
        ownerId: dto.ownerId,
      }),
      reason: dto.reason ?? actor.reason,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    // Completion closes the loop for everyone assigned to the project.
    if (dto.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      await this.announceCompletion(organizationId, id, existing.name);
    }

    return this.findOne(organizationId, id);
  }

  async remove(organizationId: string, id: string, actor: ActorContext) {
    const project = await this.prisma.project.findFirst({
      where: { id, organizationId },
      include: { _count: { select: { repositories: true } } },
    });
    if (!project) throw AppException.notFound('Project', id);
    if (project._count.repositories > 0) {
      throw AppException.conflict(
        `Cannot delete '${project.name}' while ${project._count.repositories} repository/repositories are still assigned to it`,
      );
    }

    await this.prisma.project.delete({ where: { id } });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'PROJECT',
      action: 'project.deleted',
      summary: `Project '${project.name}' deleted`,
      entityType: 'Project',
      entityId: id,
      before: { name: project.name, code: project.code },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return { id, deleted: true };
  }

  async addMember(
    organizationId: string,
    projectId: string,
    dto: AddProjectMemberDto,
    actor: ActorContext,
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true, name: true },
    });
    if (!project) throw AppException.notFound('Project', projectId);
    await this.assertMember(organizationId, dto.userId);

    await this.prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: dto.userId } },
      update: {
        roleLabel: dto.roleLabel,
        allocationPercent: dto.allocationPercent ?? 100,
      },
      create: {
        organizationId,
        projectId,
        userId: dto.userId,
        roleLabel: dto.roleLabel,
        allocationPercent: dto.allocationPercent ?? 100,
      },
    });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'PROJECT',
      action: 'project.member_added',
      summary: `User assigned to project '${project.name}'`,
      entityType: 'Project',
      entityId: projectId,
      after: { userId: dto.userId, roleLabel: dto.roleLabel },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    await this.notifications.notify({
      organizationId,
      userId: dto.userId,
      event: NotificationEvent.ASSIGNED_TO_PROJECT,
      title: `You were assigned to ${project.name}`,
      body: dto.roleLabel
        ? `You joined ${project.name} as ${dto.roleLabel}.`
        : `You joined ${project.name}.`,
      actionUrl: `/projects/${projectId}`,
    });

    const member = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { email: true, firstName: true },
    });
    if (member) {
      const appUrl = this.config.get<string>(
        'app.url',
        'http://localhost:3000',
      );
      // Never throws (WOR-13) — a mail outage must not fail the assign request.
      const projectMail = await this.mail.sendTemplate(
        member.email,
        assignedToProjectMail({
          recipientFirstName: member.firstName,
          projectName: project.name,
          roleLabel: dto.roleLabel,
          allocationPercent: dto.allocationPercent ?? 100,
          ctaUrl: `${appUrl}/projects/${projectId}`,
        }),
      );
      if (!projectMail.success) {
        this.logger.warn(
          `Assigned-to-project email failed for ${member.email}: ${projectMail.error}`,
        );
      }
    }

    return this.findOne(organizationId, projectId);
  }

  async removeMember(
    organizationId: string,
    projectId: string,
    userId: string,
    actor: ActorContext,
  ) {
    const membership = await this.prisma.projectMember.findFirst({
      where: { projectId, userId, organizationId },
    });
    if (!membership) throw AppException.notFound('Project member', userId);

    await this.prisma.projectMember.delete({ where: { id: membership.id } });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'PROJECT',
      action: 'project.member_removed',
      summary: 'User removed from project',
      entityType: 'Project',
      entityId: projectId,
      before: { userId },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return { projectId, userId, removed: true };
  }

  /**
   * Latest quality snapshot per project, aggregated across its repositories.
   * Read from stored snapshots — this never recomputes quality.
   */
  private async attachQualityScores(
    organizationId: string,
    projectIds: string[],
  ) {
    const result = new Map<
      string,
      { qualityScore: number; coveragePercent: number; locTotal: number }
    >();
    if (projectIds.length === 0) return result;

    const snapshots = await this.prisma.codeQualitySnapshot.findMany({
      where: { organizationId, projectId: { in: projectIds } },
      orderBy: { snapshotDate: 'desc' },
    });

    const seen = new Map<string, typeof snapshots>();
    for (const snapshot of snapshots) {
      if (!snapshot.projectId) continue;
      const bucket = seen.get(snapshot.projectId) ?? [];
      // Keep only the newest snapshot per repository within each project.
      if (
        !bucket.some((entry) => entry.repositoryId === snapshot.repositoryId)
      ) {
        bucket.push(snapshot);
        seen.set(snapshot.projectId, bucket);
      }
    }

    for (const [projectId, bucket] of seen) {
      result.set(projectId, {
        qualityScore: NumberUtil.average(
          bucket.map((entry) => NumberUtil.toNumber(entry.qualityScore)),
        ),
        coveragePercent: NumberUtil.average(
          bucket.map((entry) => NumberUtil.toNumber(entry.coveragePercent)),
        ),
        locTotal: NumberUtil.sum(bucket.map((entry) => entry.locTotal)),
      });
    }

    return result;
  }

  private async announceCompletion(
    organizationId: string,
    projectId: string,
    name: string,
  ) {
    const members = await this.prisma.projectMember.findMany({
      where: { organizationId, projectId },
      select: { userId: true },
    });
    await this.notifications.notifyMany(
      members.map((member) => ({
        organizationId,
        userId: member.userId,
        event: NotificationEvent.PROJECT_COMPLETION_SUMMARY,
        title: `${name} is complete`,
        body: `The project ${name} has been marked completed.`,
        actionUrl: `/projects/${projectId}`,
      })),
    );
  }

  private async assertMember(organizationId: string, userId: string) {
    const membership = await this.prisma.organizationUser.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      select: { status: true },
    });
    if (!membership || membership.status === 'REMOVED') {
      throw AppException.unprocessable(
        'That user is not a member of this organization',
      );
    }
  }

  private async assertTeams(organizationId: string, teamIds?: string[]) {
    if (!teamIds?.length) return;
    const found = await this.prisma.team.count({
      where: { organizationId, id: { in: teamIds } },
    });
    if (found !== teamIds.length) {
      throw AppException.unprocessable(
        'One or more teams do not belong to this organization',
      );
    }
  }
}

function toView(
  project: Prisma.ProjectGetPayload<{ include: typeof LIST_INCLUDE }>,
  quality?: { qualityScore: number; coveragePercent: number; locTotal: number },
) {
  const { _count, teams, ...rest } = project;
  return {
    ...rest,
    progressPercent: NumberUtil.toNumber(project.progressPercent),
    memberCount: _count.members,
    repositoryCount: _count.repositories,
    teams: teams.map((entry) => ({
      ...entry.team,
      isPrimary: entry.isPrimary,
    })),
    qualityScore: quality?.qualityScore ?? null,
    coveragePercent: quality?.coveragePercent ?? null,
    // LOC is activity only and carries no scoring weight.
    linesOfCode: quality?.locTotal ?? null,
  };
}

function assertDateOrder(start?: string | null, end?: string | null): void {
  if (start && end && new Date(start) > new Date(end)) {
    throw AppException.badRequest('startDate must be on or before endDate');
  }
}
