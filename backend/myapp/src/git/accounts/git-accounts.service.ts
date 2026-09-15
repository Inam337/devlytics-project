import { Injectable, Logger } from '@nestjs/common';
import { GitIdentityClassification, Prisma } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { PaginatedResult, PaginationQueryDto } from '../../common/dto/pagination.dto';
import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../database/prisma.service';
import type { ActorContext } from '../../organizations/organizations.service';
import { ClassifyGitIdentityDto, LinkGitIdentityDto } from '../providers/dto/git-provider.dto';

/** Automation accounts recognised by name, in addition to provider bot flags. */
const BOT_PATTERNS = [
  /\[bot\]$/i,
  /^dependabot/i,
  /^renovate/i,
  /^github-actions/i,
  /^gitlab-ci/i,
  /^snyk-bot/i,
  /-bot$/i,
  /^semantic-release/i,
];

export interface IdentityCandidate {
  providerId: string;
  organizationId: string;
  username?: string | null;
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  externalUserId?: string | null;
}

/**
 * Git identity resolution (sync pipeline stage 3).
 *
 * Commit email → provider username → invited member email. Matched identities
 * attach to a user; unmatched ones sit in a review queue and score nothing; bot
 * accounts are recorded but excluded from all scoring.
 */
@Injectable()
export class GitAccountsService {
  private readonly logger = new Logger(GitAccountsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  static isBotIdentity(username?: string | null, email?: string | null): boolean {
    const subject = username ?? email ?? '';
    return BOT_PATTERNS.some((pattern) => pattern.test(subject));
  }

  /**
   * Upserts an identity seen during collection and attempts to match it.
   * Idempotent, so replaying a sync never creates duplicates.
   */
  async resolve(candidate: IdentityCandidate): Promise<{ userId: string | null; isBot: boolean }> {
    const username = candidate.username?.trim() || candidate.email?.trim();
    if (!username) return { userId: null, isBot: false };

    const isBot = GitAccountsService.isBotIdentity(candidate.username, candidate.email);
    const email = candidate.email?.trim().toLowerCase() || null;

    const existing = await this.prisma.gitAccount.findUnique({
      where: { providerId_username: { providerId: candidate.providerId, username } },
    });

    // A manual link is authoritative; never overwrite it with a heuristic match.
    if (existing?.userId) return { userId: existing.userId, isBot: existing.isBot };

    const matchedUserId = isBot ? null : await this.matchUser(candidate.organizationId, email, username);

    const account = await this.prisma.gitAccount.upsert({
      where: { providerId_username: { providerId: candidate.providerId, username } },
      update: {
        commitEmail: email ?? existing?.commitEmail,
        avatarUrl: candidate.avatarUrl ?? existing?.avatarUrl,
        externalUserId: candidate.externalUserId ?? existing?.externalUserId,
        isBot,
        ...(matchedUserId
          ? {
              userId: matchedUserId,
              classification: GitIdentityClassification.MATCHED,
              matchedAt: new Date(),
            }
          : {
              classification: isBot
                ? GitIdentityClassification.BOT
                : GitIdentityClassification.UNMATCHED,
            }),
      },
      create: {
        organizationId: candidate.organizationId,
        providerId: candidate.providerId,
        username,
        commitEmail: email,
        avatarUrl: candidate.avatarUrl,
        externalUserId: candidate.externalUserId,
        isBot,
        userId: matchedUserId,
        classification: isBot
          ? GitIdentityClassification.BOT
          : matchedUserId
            ? GitIdentityClassification.MATCHED
            : GitIdentityClassification.UNMATCHED,
        matchedAt: matchedUserId ? new Date() : null,
      },
    });

    return { userId: account.userId, isBot: account.isBot };
  }

  async findAll(
    organizationId: string,
    query: PaginationQueryDto,
    classification?: GitIdentityClassification,
  ) {
    const where: Prisma.GitAccountWhereInput = {
      organizationId,
      ...(classification ? { classification } : {}),
      ...(query.search
        ? {
            OR: [
              { username: { contains: query.search, mode: 'insensitive' } },
              { commitEmail: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.gitAccount.findMany({
        where,
        orderBy: [{ classification: 'asc' }, { username: 'asc' }],
        skip: query.skip,
        take: query.limit,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          provider: { select: { id: true, providerType: true, displayName: true } },
        },
      }),
      this.prisma.gitAccount.count({ where }),
    ]);

    return PaginatedResult.from(items, total, query);
  }

  /** Manually attaches an unmatched identity to a member. */
  async link(organizationId: string, id: string, dto: LinkGitIdentityDto, actor: ActorContext) {
    const account = await this.prisma.gitAccount.findFirst({ where: { id, organizationId } });
    if (!account) throw AppException.notFound('Git identity', id);

    const membership = await this.prisma.organizationUser.findUnique({
      where: { organizationId_userId: { organizationId, userId: dto.userId } },
      select: { status: true },
    });
    if (!membership || membership.status === 'REMOVED') {
      throw AppException.unprocessable('That user is not a member of this organization');
    }

    const updated = await this.prisma.gitAccount.update({
      where: { id },
      data: {
        userId: dto.userId,
        classification: GitIdentityClassification.MATCHED,
        isBot: false,
        matchedAt: new Date(),
      },
    });

    // Historical rows are re-attributed so past evidence counts for the person.
    await this.reattributeHistory(organizationId, updated.username, dto.userId);

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'INTEGRATION',
      action: 'git_identity.linked',
      summary: `Git identity '${account.username}' linked to a member`,
      entityType: 'GitAccount',
      entityId: id,
      before: { userId: account.userId, classification: account.classification },
      after: { userId: dto.userId, classification: GitIdentityClassification.MATCHED },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return updated;
  }

  /** Flags an identity as automation, which excludes it from all scoring. */
  async classify(
    organizationId: string,
    id: string,
    dto: ClassifyGitIdentityDto,
    actor: ActorContext,
  ) {
    const account = await this.prisma.gitAccount.findFirst({ where: { id, organizationId } });
    if (!account) throw AppException.notFound('Git identity', id);

    const updated = await this.prisma.gitAccount.update({
      where: { id },
      data: {
        isBot: dto.isBot,
        classification: dto.isBot
          ? GitIdentityClassification.BOT
          : account.userId
            ? GitIdentityClassification.MATCHED
            : GitIdentityClassification.UNMATCHED,
        ...(dto.isBot ? { userId: null } : {}),
      },
    });

    if (dto.isBot) {
      await this.prisma.commit.updateMany({
        where: { organizationId, metadata: { path: ['authorUsername'], equals: account.username } },
        data: { isBot: true, authorId: null },
      });
    }

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'INTEGRATION',
      action: 'git_identity.classified',
      summary: `Git identity '${account.username}' marked ${dto.isBot ? 'bot' : 'human'}`,
      entityType: 'GitAccount',
      entityId: id,
      before: { isBot: account.isBot, classification: account.classification },
      after: { isBot: updated.isBot, classification: updated.classification },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return updated;
  }

  /** Identities awaiting manual review — they score nothing until resolved. */
  async reviewQueue(organizationId: string) {
    const unmatched = await this.prisma.gitAccount.findMany({
      where: { organizationId, classification: GitIdentityClassification.UNMATCHED },
      include: { provider: { select: { providerType: true, displayName: true } } },
      orderBy: { username: 'asc' },
    });

    return {
      count: unmatched.length,
      note: 'Unmatched identities are recorded but contribute nothing to any score.',
      identities: unmatched,
    };
  }

  private async matchUser(
    organizationId: string,
    email: string | null,
    username: string,
  ): Promise<string | null> {
    if (email) {
      const byEmail = await this.prisma.organizationUser.findFirst({
        where: { organizationId, user: { email }, status: { not: 'REMOVED' } },
        select: { userId: true },
      });
      if (byEmail) return byEmail.userId;
    }

    // Fall back to an existing identity with the same username on another provider.
    const sibling = await this.prisma.gitAccount.findFirst({
      where: { organizationId, username, userId: { not: null } },
      select: { userId: true },
    });
    return sibling?.userId ?? null;
  }

  /** Re-points previously unattributed activity at the newly linked member. */
  private async reattributeHistory(organizationId: string, username: string, userId: string) {
    const filter = { path: ['authorUsername'], equals: username } as const;
    const [commits, pulls, reviews] = await this.prisma.$transaction([
      this.prisma.commit.updateMany({
        where: { organizationId, authorId: null, metadata: filter },
        data: { authorId: userId },
      }),
      this.prisma.pullRequest.updateMany({
        where: { organizationId, authorId: null, metadata: filter },
        data: { authorId: userId },
      }),
      this.prisma.pullRequestReview.updateMany({
        where: {
          organizationId,
          reviewerId: null,
          metadata: { path: ['reviewerUsername'], equals: username },
        },
        data: { reviewerId: userId },
      }),
    ]);

    this.logger.log(
      `Re-attributed ${commits.count} commits, ${pulls.count} pull requests and ${reviews.count} reviews to ${userId}`,
    );
  }
}
