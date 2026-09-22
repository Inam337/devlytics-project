import { Injectable } from '@nestjs/common';
import { AiProviderType } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/exceptions/app.exception';
import { CryptoService } from '../common/services/crypto.service';
import { PrismaService } from '../database/prisma.service';
import type { ActorContext } from '../organizations/organizations.service';
import { AiProviderAdapter } from './providers/ai-provider.adapter';
import { OllamaAdapter } from './providers/ollama.adapter';
import { CreateAiIntegrationDto, UpdateAiIntegrationDto } from './dto/ai.dto';

/**
 * Provider and integration management. The default provider is local Ollama —
 * external providers (OpenAI, Claude, Gemini) are opt-in per organization and
 * their keys are stored encrypted.
 */
@Injectable()
export class AiProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly audit: AuditService,
  ) {}

  findProviders(organizationId: string) {
    return this.prisma.aiProvider.findMany({
      where: { organizationId },
      orderBy: { providerType: 'asc' },
    });
  }

  async findIntegrations(organizationId: string) {
    const integrations = await this.prisma.aiIntegration.findMany({
      where: { organizationId },
      include: {
        provider: { select: { providerType: true, name: true, isLocal: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return integrations.map(({ apiKeyEncrypted, ...rest }) => ({
      ...rest,
      hasApiKey: Boolean(apiKeyEncrypted),
    }));
  }

  async createIntegration(
    organizationId: string,
    dto: CreateAiIntegrationDto,
    actor: ActorContext,
  ) {
    const provider = await this.prisma.aiProvider.upsert({
      where: {
        organizationId_providerType: {
          organizationId,
          providerType: dto.providerType,
        },
      },
      update: {},
      create: {
        organizationId,
        providerType: dto.providerType,
        name: dto.providerType,
        isLocal: dto.providerType === 'OLLAMA',
        isEnabled: true,
        defaultModel: dto.model,
        baseUrl: dto.baseUrl ?? defaultBaseUrl(dto.providerType),
      },
    });

    if (dto.providerType !== 'OLLAMA' && !dto.apiKey) {
      throw AppException.badRequest(
        'apiKey is required for external AI providers',
      );
    }

    if (dto.isDefault) {
      await this.prisma.aiIntegration.updateMany({
        where: { organizationId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const integration = await this.prisma.aiIntegration.create({
      data: {
        organizationId,
        providerId: provider.id,
        name: dto.name,
        model: dto.model,
        apiKeyEncrypted: this.crypto.encrypt(dto.apiKey),
        baseUrl: dto.baseUrl,
        isDefault: dto.isDefault ?? false,
        sanitizeContext: dto.sanitizeContext ?? true,
      },
    });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'AI',
      action: 'ai_integration.created',
      summary: `AI integration '${integration.name}' (${dto.providerType}) created`,
      entityType: 'AiIntegration',
      entityId: integration.id,
      after: {
        providerType: dto.providerType,
        model: dto.model,
        isLocal: provider.isLocal,
      },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    const { apiKeyEncrypted, ...rest } = integration;
    return { ...rest, hasApiKey: Boolean(apiKeyEncrypted) };
  }

  async updateIntegration(
    organizationId: string,
    id: string,
    dto: UpdateAiIntegrationDto,
    actor: ActorContext,
  ) {
    const existing = await this.prisma.aiIntegration.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw AppException.notFound('AI integration', id);

    if (dto.isDefault) {
      await this.prisma.aiIntegration.updateMany({
        where: { organizationId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.aiIntegration.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.model !== undefined ? { model: dto.model } : {}),
        ...(dto.baseUrl !== undefined ? { baseUrl: dto.baseUrl } : {}),
        ...(dto.apiKey !== undefined
          ? { apiKeyEncrypted: this.crypto.encrypt(dto.apiKey) }
          : {}),
        ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
        ...(dto.isEnabled !== undefined ? { isEnabled: dto.isEnabled } : {}),
        ...(dto.sanitizeContext !== undefined
          ? { sanitizeContext: dto.sanitizeContext }
          : {}),
      },
    });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'AI',
      action: 'ai_integration.updated',
      summary: `AI integration '${existing.name}' updated`,
      entityType: 'AiIntegration',
      entityId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    const { apiKeyEncrypted, ...rest } = updated;
    return { ...rest, hasApiKey: Boolean(apiKeyEncrypted) };
  }

  async removeIntegration(
    organizationId: string,
    id: string,
    actor: ActorContext,
  ) {
    const existing = await this.prisma.aiIntegration.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw AppException.notFound('AI integration', id);

    await this.prisma.aiIntegration.delete({ where: { id } });

    await this.audit.record({
      organizationId,
      actorId: actor.actorId,
      category: 'AI',
      action: 'ai_integration.deleted',
      summary: `AI integration '${existing.name}' deleted`,
      entityType: 'AiIntegration',
      entityId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return { id, deleted: true };
  }

  /** Resolves the integration to use: the org's default, else local Ollama. */
  async resolveAdapter(organizationId: string): Promise<{
    adapter: AiProviderAdapter;
    model: string;
    sanitize: boolean;
    integrationId?: string;
  }> {
    const defaultIntegration = await this.prisma.aiIntegration.findFirst({
      where: { organizationId, isDefault: true, isEnabled: true },
      include: { provider: true },
    });

    if (
      defaultIntegration &&
      defaultIntegration.provider.providerType !== 'OLLAMA'
    ) {
      const apiKey = this.crypto.decrypt(defaultIntegration.apiKeyEncrypted);
      if (!apiKey) {
        throw AppException.unprocessable(
          'The configured AI integration has no usable API key',
        );
      }
      // External adapters (OpenAI/Claude/Gemini) can be added behind this same
      // interface without changing AiAnalysisService.
      throw AppException.unprocessable(
        `Provider ${defaultIntegration.provider.providerType} is not yet implemented behind the adapter interface`,
      );
    }

    const ollamaProvider = await this.prisma.aiProvider.findUnique({
      where: {
        organizationId_providerType: {
          organizationId,
          providerType: AiProviderType.OLLAMA,
        },
      },
    });
    if (!ollamaProvider?.isEnabled) {
      throw AppException.unprocessable(
        'No enabled AI provider is configured for this organization',
      );
    }

    return {
      adapter: new OllamaAdapter(
        ollamaProvider.baseUrl,
        ollamaProvider.defaultModel,
      ),
      model: ollamaProvider.defaultModel,
      sanitize: defaultIntegration?.sanitizeContext ?? true,
      integrationId: defaultIntegration?.id,
    };
  }
}

function defaultBaseUrl(providerType: AiProviderType): string {
  switch (providerType) {
    case 'OLLAMA':
      return 'http://localhost:11434';
    case 'OPENAI':
      return 'https://api.openai.com/v1';
    case 'CLAUDE':
      return 'https://api.anthropic.com/v1';
    case 'GEMINI':
      return 'https://generativelanguage.googleapis.com/v1beta';
    default:
      return '';
  }
}
