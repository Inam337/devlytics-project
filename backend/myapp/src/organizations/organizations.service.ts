import { Injectable, Logger } from '@nestjs/common';
import { Organization, Prisma, RoleKey } from '@prisma/client';
import {
  ROLE_DEFINITIONS,
  ROLE_PERMISSIONS,
} from '../common/constants/permissions';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../database/prisma.service';
import {
  DEFAULT_SCORING_WEIGHTS,
  SCORE_CATEGORIES,
} from '../scoring/scoring.constants';
import { AuditService } from '../audit/audit.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsRepository } from './organizations.repository';

export interface ActorContext {
  actorId?: string;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
}

/**
 * Organization lifecycle and tenant provisioning.
 *
 * `provision()` is the single place a new tenant gets its roles, permission
 * grants, initial scoring weight version and local AI provider — registration
 * and the create-organization endpoint both call it rather than duplicating the
 * bootstrap.
 */
@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: OrganizationsRepository,
    private readonly audit: AuditService,
  ) {}

  async create(
    dto: CreateOrganizationDto,
    actor: ActorContext = {},
  ): Promise<Organization> {
    const slug = await this.resolveSlug(dto.slug ?? dto.name);

    const organization = await this.prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({
        data: {
          name: dto.name,
          slug,
          description: dto.description,
          industry: dto.industry,
          timezone: dto.timezone ?? 'UTC',
          logoUrl: dto.logoUrl,
          faviconUrl: dto.faviconUrl,
          primaryColor: dto.primaryColor ?? '#372b73',
          secondaryColor: dto.secondaryColor ?? '#0B7D9E',
          dateFormat: dto.dateFormat ?? 'YYYY-MM-DD',
          currency: dto.currency ?? 'USD',
          onboardingState: {
            currentStep: 1,
            completedSteps: [],
            skipped: false,
          },
        },
      });
      await this.provision(created.id, tx, actor.actorId);
      return created;
    });

    await this.audit.record({
      organizationId: organization.id,
      actorId: actor.actorId,
      category: 'ORGANIZATION',
      action: 'organization.created',
      summary: `Organization '${organization.name}' created`,
      entityType: 'Organization',
      entityId: organization.id,
      after: { name: organization.name, slug: organization.slug },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return organization;
  }

  /**
   * Creates the six system roles with their permission grants, the initial
   * weight version and the local-first AI provider for a tenant. Idempotent, so
   * it can safely run again for an organization created before a catalog change.
   */
  async provision(
    organizationId: string,
    tx: Prisma.TransactionClient,
    actorId?: string,
  ): Promise<void> {
    const permissions = await tx.permission.findMany();
    const permissionIdByKey = new Map(
      permissions.map((permission) => [permission.key, permission.id]),
    );

    if (permissionIdByKey.size === 0) {
      throw AppException.unprocessable(
        'Permission catalog is empty — reference data has not been synchronised',
      );
    }

    for (const definition of ROLE_DEFINITIONS) {
      const role = await tx.role.upsert({
        where: { organizationId_key: { organizationId, key: definition.key } },
        update: { name: definition.name, description: definition.description },
        create: {
          organizationId,
          key: definition.key,
          name: definition.name,
          description: definition.description,
        },
      });

      const grants = ROLE_PERMISSIONS[definition.key as RoleKey]
        .map((key) => permissionIdByKey.get(key))
        .filter((id): id is string => Boolean(id))
        .map((permissionId) => ({ roleId: role.id, permissionId }));

      if (grants.length > 0) {
        await tx.rolePermission.createMany({
          data: grants,
          skipDuplicates: true,
        });
      }
    }

    await tx.scoringRule.createMany({
      data: SCORE_CATEGORIES.map((category) => ({
        organizationId,
        weightVersion: 1,
        category,
        weightPercent: new Prisma.Decimal(DEFAULT_SCORING_WEIGHTS[category]),
        isActive: true,
        reason: 'Initial default weight configuration',
        createdById: actorId ?? null,
      })),
      skipDuplicates: true,
    });

    await tx.aiProvider.upsert({
      where: {
        organizationId_providerType: { organizationId, providerType: 'OLLAMA' },
      },
      update: {},
      create: {
        organizationId,
        providerType: 'OLLAMA',
        name: 'Ollama (local)',
        isLocal: true,
        isEnabled: true,
        defaultModel: process.env.OLLAMA_MODEL ?? 'llama3.1',
        baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
      },
    });

    this.logger.log(
      `Provisioned roles, weights and local AI provider for organization ${organizationId}`,
    );
  }

  findAllForUser(userId: string) {
    return this.repository.findForUser(userId);
  }

  async findOne(organizationId: string, requestedId: string) {
    // A caller may only read the organization their token was issued for.
    if (organizationId !== requestedId) {
      throw AppException.forbidden(
        'You do not have access to this organization',
      );
    }
    const organization = await this.repository.findById(requestedId);
    if (!organization) throw AppException.notFound('Organization', requestedId);
    const counts = await this.repository.counts(requestedId);
    return { ...organization, counts };
  }

  async update(
    organizationId: string,
    requestedId: string,
    dto: UpdateOrganizationDto,
    actor: ActorContext,
  ) {
    if (organizationId !== requestedId) {
      throw AppException.forbidden(
        'You do not have access to this organization',
      );
    }
    const before = await this.repository.findById(requestedId);
    if (!before) throw AppException.notFound('Organization', requestedId);

    const slug =
      dto.slug && dto.slug !== before.slug
        ? await this.resolveSlug(dto.slug)
        : undefined;

    const updated = await this.repository.update(requestedId, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(slug ? { slug } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description }
        : {}),
      ...(dto.industry !== undefined ? { industry: dto.industry } : {}),
      ...(dto.timezone !== undefined ? { timezone: dto.timezone } : {}),
      ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
      ...(dto.faviconUrl !== undefined ? { faviconUrl: dto.faviconUrl } : {}),
      ...(dto.primaryColor !== undefined
        ? { primaryColor: dto.primaryColor }
        : {}),
      ...(dto.secondaryColor !== undefined
        ? { secondaryColor: dto.secondaryColor }
        : {}),
      ...(dto.dateFormat !== undefined ? { dateFormat: dto.dateFormat } : {}),
      ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.onboardingState !== undefined
        ? { onboardingState: dto.onboardingState as Prisma.InputJsonValue }
        : {}),
    });

    await this.audit.record({
      organizationId: requestedId,
      actorId: actor.actorId,
      category: 'ORGANIZATION',
      action: 'organization.updated',
      summary: `Organization '${updated.name}' updated`,
      entityType: 'Organization',
      entityId: requestedId,
      before: pickAuditable(before),
      after: pickAuditable(updated),
      reason: actor.reason,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return updated;
  }

  /** Slugifies and de-duplicates, so two organizations never collide. */
  private async resolveSlug(source: string): Promise<string> {
    const base =
      source
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 140) || 'organization';

    let candidate = base;
    let suffix = 1;
    while (await this.repository.findBySlug(candidate)) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
      if (suffix > 999)
        throw AppException.conflict(
          'Could not derive a unique organization slug',
        );
    }
    return candidate;
  }
}

function pickAuditable(organization: Organization) {
  const { id, createdAt, updatedAt, ...rest } = organization;
  void id;
  void createdAt;
  void updatedAt;
  return rest;
}
