import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { AppException } from '../common/exceptions/app.exception';
import { NumberUtil } from '../common/utils/number.util';
import { PaginatedResult } from '../common/dto/pagination.dto';
import { PrismaService } from '../database/prisma.service';
import { QualityAnalysisService } from '../quality/quality-analysis.service';
import type { ActorContext } from '../organizations/organizations.service';
import { QUEUE } from '../queue/queue.constants';
import { safeEnqueue } from '../queue/queue.util';
import { AiProvidersService } from './ai-providers.service';
import { sanitizeForAi } from './context-sanitizer';
import { AiProviderError } from './providers/ai-provider.adapter';
import { AnalysisQueryDto, AiUsageQueryDto } from './dto/ai.dto';

interface ParsedInterpretation {
  inference: string;
  confidence: number;
  recommendation: string;
}

const SYSTEM_PROMPT = `You are Devlytics' code-quality interpreter. You receive one OBSERVED FACT that was
produced by a deterministic rule — never invent a problem beyond it. Respond with strict JSON:
{"inference": string, "confidence": number between 0 and 1, "recommendation": string}.
"inference" explains what the observed fact likely means for the team.
"recommendation" is one concrete, actionable change.`;

/**
 * AI interpretation layer (docs requirements §11).
 *
 * Reads the deterministic findings `QualityAnalysisService` already persisted
 * and adds an AI inference, a confidence score and a recommendation to each —
 * it never produces a finding on its own. If the provider is unreachable, the
 * observed facts and the analysis run stay exactly as they were; nothing is
 * invented to fill the gap.
 */
@Injectable()
export class AiAnalysisService {
  private readonly logger = new Logger(AiAnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: AiProvidersService,
    private readonly qualityAnalysis: QualityAnalysisService,
    @InjectQueue(QUEUE.AI_ANALYSIS) private readonly aiQueue: Queue,
  ) {}

  /**
   * Runs the deterministic pass inline (fast, local, no external calls — see
   * `QualityAnalysisService#analyzeRepository`) so a real run id is available
   * immediately, then queues only the genuinely slow part — the AI provider
   * round-trip — onto the `ai-analysis` worker (requirements §12).
   */
  async triggerAnalysis(
    organizationId: string,
    repositoryId: string,
    actor: ActorContext,
  ) {
    const repository = await this.prisma.repository.findFirst({
      where: { id: repositoryId, organizationId },
      select: { id: true, fullName: true },
    });
    if (!repository) throw AppException.notFound('Repository', repositoryId);

    // Deterministic evidence must exist before AI ever runs against it.
    const outcome = await this.qualityAnalysis.analyzeRepository(
      organizationId,
      repositoryId,
      actor.actorId,
    );

    const queued = await this.enqueueInterpretation(
      organizationId,
      repositoryId,
      outcome.runId,
      actor.actorId,
    );

    return {
      runId: outcome.runId,
      runNumber: outcome.runNumber,
      qualityScore: outcome.qualityScore,
      issuesFound: outcome.issuesFound,
      queued,
    };
  }

  async retry(organizationId: string, runId: string, actor: ActorContext) {
    const run = await this.prisma.aiAnalysisRun.findFirst({
      where: { id: runId, organizationId },
    });
    if (!run) throw AppException.notFound('Analysis run', runId);

    const queued = await this.enqueueInterpretation(
      organizationId,
      run.repositoryId,
      runId,
      actor.actorId,
    );

    return { runId, queued };
  }

  private async enqueueInterpretation(
    organizationId: string,
    repositoryId: string | null,
    runId: string,
    requestedBy?: string,
  ): Promise<boolean> {
    await this.prisma.aiAnalysisRun.update({
      where: { id: runId },
      data: { status: 'RUNNING' },
    });

    return safeEnqueue(
      this.aiQueue,
      'interpret-analysis',
      {
        organizationId,
        repositoryId: repositoryId ?? undefined,
        runId,
        requestedBy,
      },
      this.logger,
      { jobId: randomUUID() },
    );
  }

  /**
   * Runs the AI interpretation pass and finalizes the run's status —
   * called from `AiAnalysisProcessor`. An unreachable/unavailable provider is
   * a soft outcome (`interpretRun` already reports `aiAvailable: false`
   * without throwing), so the run still completes; only an unexpected error
   * marks it failed, per devlytics.md §4.2 ("failures freeze, they do not
   * drift") — the deterministic analysis this run already holds is untouched.
   */
  async runInterpretation(
    organizationId: string,
    runId: string,
    requestedBy?: string,
  ) {
    try {
      const result = await this.interpretRun(
        organizationId,
        runId,
        requestedBy,
      );
      await this.prisma.aiAnalysisRun.update({
        where: { id: runId },
        data: { status: 'COMPLETED' },
      });
      return result;
    } catch (error) {
      await this.prisma.aiAnalysisRun.update({
        where: { id: runId },
        data: {
          status: 'FAILED',
          errorMessage: (error as Error).message.slice(0, 1000),
        },
      });
      throw error;
    }
  }

  private async interpretRun(
    organizationId: string,
    runId: string,
    requestedBy?: string,
  ) {
    const issues = await this.prisma.codeQualityIssue.findMany({
      where: { organizationId, analysisRunId: runId, aiInference: null },
    });

    if (issues.length === 0) {
      return { interpreted: 0, recommendations: 0, aiAvailable: true };
    }

    let adapterInfo;
    try {
      adapterInfo = await this.providers.resolveAdapter(organizationId);
    } catch (error) {
      this.logger.warn(
        `AI interpretation skipped for run ${runId}: ${(error as Error).message}`,
      );
      return {
        interpreted: 0,
        recommendations: 0,
        aiAvailable: false,
        reason: (error as Error).message,
      };
    }

    let interpreted = 0;
    let recommendations = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    let aiAvailable = true;

    for (const issue of issues) {
      const context = adapterInfo.sanitize
        ? sanitizeForAi(issue.observedFact)
        : issue.observedFact;

      try {
        const result = await adapterInfo.adapter.complete({
          systemPrompt: SYSTEM_PROMPT,
          userPrompt: `Rule: ${issue.ruleId}\nCategory: ${issue.category}\nSeverity: ${issue.severity}\nObserved fact: ${context}`,
          maxTokens: 400,
          temperature: 0.2,
        });

        promptTokens += result.promptTokens;
        completionTokens += result.completionTokens;

        const parsed = parseInterpretation(result.content, issue.title);

        await this.prisma.$transaction([
          this.prisma.codeQualityIssue.update({
            where: { id: issue.id },
            data: {
              aiInference: parsed.inference,
              aiConfidence: new Prisma.Decimal(parsed.confidence),
            },
          }),
          this.prisma.improvementRecommendation.create({
            data: {
              organizationId,
              analysisRunId: runId,
              qualityIssueId: issue.id,
              category: issue.category,
              title: `Address: ${issue.title}`,
              recommendation: parsed.recommendation,
              rationale: parsed.inference,
              aiConfidence: new Prisma.Decimal(parsed.confidence),
              effort: issue.effort,
              impact: issue.impact,
              priority: priorityFromSeverity(issue.severity),
            },
          }),
        ]);

        interpreted += 1;
        recommendations += 1;
      } catch (error) {
        const providerError = error as AiProviderError;
        this.logger.warn(
          `AI interpretation failed for issue ${issue.id}: ${providerError.message}`,
        );
        if (providerError.unavailable) {
          aiAvailable = false;
          break; // Stop trying the rest — the provider itself is down.
        }
      }
    }

    await this.prisma.aiAnalysisRun.update({
      where: { id: runId },
      data: {
        promptTokens: { increment: promptTokens },
        completionTokens: { increment: completionTokens },
        model: adapterInfo.model,
      },
    });

    if (promptTokens + completionTokens > 0) {
      await this.prisma.aiUsage.create({
        data: {
          organizationId,
          userId: requestedBy,
          toolName: 'devlytics-ai-analysis',
          usageDate: new Date(new Date().toISOString().slice(0, 10)),
          requestCount: interpreted,
          promptTokens,
          completionTokens,
        },
      });
    }

    return { interpreted, recommendations, aiAvailable };
  }

  async findAll(organizationId: string, query: AnalysisQueryDto) {
    const where: Prisma.AiAnalysisRunWhereInput = {
      organizationId,
      ...(query.repositoryId ? { repositoryId: query.repositoryId } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.aiAnalysisRun.findMany({
        where,
        orderBy: { runNumber: 'desc' },
        skip: query.skip,
        take: query.limit,
        include: {
          repository: { select: { id: true, name: true, fullName: true } },
        },
      }),
      this.prisma.aiAnalysisRun.count({ where }),
    ]);

    return PaginatedResult.from(items, total, query);
  }

  async findOne(organizationId: string, id: string) {
    const run = await this.prisma.aiAnalysisRun.findFirst({
      where: { id, organizationId },
      include: {
        repository: { select: { id: true, name: true, fullName: true } },
        qualityIssues: true,
        recommendations: true,
      },
    });
    if (!run) throw AppException.notFound('Analysis run', id);
    return run;
  }

  async usage(organizationId: string, query: AiUsageQueryDto) {
    const since = new Date(
      Date.now() - (query.days ?? 30) * 24 * 60 * 60 * 1000,
    );
    const where: Prisma.AiUsageWhereInput = {
      organizationId,
      usageDate: { gte: since },
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.teamId ? { teamId: query.teamId } : {}),
    };

    const [items, totals] = await Promise.all([
      this.prisma.aiUsage.findMany({
        where,
        orderBy: { usageDate: 'desc' },
        take: query.limit,
        skip: query.skip,
      }),
      this.prisma.aiUsage.aggregate({
        where,
        _sum: {
          requestCount: true,
          promptTokens: true,
          completionTokens: true,
        },
      }),
    ]);

    return {
      items,
      totals: {
        requests: totals._sum.requestCount ?? 0,
        promptTokens: totals._sum.promptTokens ?? 0,
        completionTokens: totals._sum.completionTokens ?? 0,
      },
      // AI usage is explicitly excluded from scoring — surfaced here, never in a score.
      note: 'AI usage is informational and is never a direct ranking reward.',
    };
  }
}

function parseInterpretation(
  content: string,
  fallbackTitle: string,
): ParsedInterpretation {
  try {
    const match = content.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(
      match ? match[0] : content,
    ) as Partial<ParsedInterpretation>;
    return {
      inference: String(
        parsed.inference ??
          `This may indicate risk related to: ${fallbackTitle}`,
      ),
      confidence:
        NumberUtil.clampScore(Number(parsed.confidence ?? 0.5) * 100) / 100,
      recommendation: String(
        parsed.recommendation ?? 'Review this finding with the team.',
      ),
    };
  } catch {
    return {
      inference:
        content.slice(0, 500) ||
        `This may indicate risk related to: ${fallbackTitle}`,
      confidence: 0.4,
      recommendation:
        'Review this finding with the team and confirm a remediation plan.',
    };
  }
}

function priorityFromSeverity(severity: string): number {
  switch (severity) {
    case 'BLOCKER':
      return 1;
    case 'CRITICAL':
      return 2;
    case 'MAJOR':
      return 3;
    case 'MINOR':
      return 4;
    default:
      return 5;
  }
}
