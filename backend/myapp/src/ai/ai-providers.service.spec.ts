import type { AuditService } from '../audit/audit.service';
import { AppException } from '../common/exceptions/app.exception';
import type { CryptoService } from '../common/services/crypto.service';
import type { PrismaService } from '../database/prisma.service';
import type { ActorContext } from '../organizations/organizations.service';
import { AiProvidersService } from './ai-providers.service';
import { OllamaAdapter } from './providers/ollama.adapter';

describe('AiProvidersService', () => {
  let prisma: {
    aiProvider: {
      findMany: jest.Mock;
      upsert: jest.Mock;
      findUnique: jest.Mock;
    };
    aiIntegration: {
      findMany: jest.Mock;
      updateMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      findFirst: jest.Mock;
    };
  };
  let crypto: { encrypt: jest.Mock; decrypt: jest.Mock };
  let audit: { record: jest.Mock };
  let service: AiProvidersService;

  const actor: ActorContext = { actorId: 'user-1' };

  beforeEach(() => {
    prisma = {
      aiProvider: {
        findMany: jest.fn(),
        upsert: jest
          .fn()
          .mockResolvedValue({ id: 'provider-1', isLocal: true }),
        findUnique: jest.fn(),
      },
      aiIntegration: {
        findMany: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn().mockResolvedValue(undefined),
        findFirst: jest.fn(),
      },
    };
    crypto = {
      encrypt: jest.fn((value?: string) => (value ? `enc(${value})` : null)),
      decrypt: jest.fn((value?: string | null) =>
        value ? value.replace(/^enc\(|\)$/g, '') : null,
      ),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };

    service = new AiProvidersService(
      prisma as unknown as PrismaService,
      crypto as unknown as CryptoService,
      audit as unknown as AuditService,
    );
  });

  describe('createIntegration', () => {
    it('rejects an external provider integration with no apiKey', async () => {
      prisma.aiProvider.upsert.mockResolvedValue({
        id: 'provider-1',
        isLocal: false,
      });

      await expect(
        service.createIntegration(
          'org-1',
          {
            providerType: 'OPENAI',
            name: 'Team OpenAI',
            model: 'gpt-4o',
          } as never,
          actor,
        ),
      ).rejects.toThrow(AppException);
      expect(prisma.aiIntegration.create).not.toHaveBeenCalled();
    });

    it('allows OLLAMA with no apiKey and stores it encrypted (null) with hasApiKey false', async () => {
      prisma.aiIntegration.create.mockResolvedValue({
        id: 'integration-1',
        name: 'Team Ollama',
        apiKeyEncrypted: null,
      });

      const result = await service.createIntegration(
        'org-1',
        {
          providerType: 'OLLAMA',
          name: 'Team Ollama',
          model: 'llama3.1',
        } as never,
        actor,
      );

      expect(result.hasApiKey).toBe(false);
      expect(result).not.toHaveProperty('apiKeyEncrypted');
    });

    it('encrypts the apiKey and unsets the previous default when isDefault is true', async () => {
      prisma.aiProvider.upsert.mockResolvedValue({
        id: 'provider-1',
        isLocal: false,
      });
      prisma.aiIntegration.create.mockResolvedValue({
        id: 'integration-1',
        name: 'Team OpenAI',
        apiKeyEncrypted: 'enc(secret-key)',
      });

      const result = await service.createIntegration(
        'org-1',
        {
          providerType: 'OPENAI',
          name: 'Team OpenAI',
          model: 'gpt-4o',
          apiKey: 'secret-key',
          isDefault: true,
        } as never,
        actor,
      );

      expect(prisma.aiIntegration.updateMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1', isDefault: true },
        data: { isDefault: false },
      });
      expect(crypto.encrypt).toHaveBeenCalledWith('secret-key');
      expect(prisma.aiIntegration.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ apiKeyEncrypted: 'enc(secret-key)' }),
        }),
      );
      expect(result.hasApiKey).toBe(true);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ai_integration.created' }),
      );
    });
  });

  describe('updateIntegration', () => {
    it('throws not-found for an integration outside the organization', async () => {
      prisma.aiIntegration.findFirst.mockResolvedValue(null);

      await expect(
        service.updateIntegration(
          'org-1',
          'integration-from-other-org',
          {} as never,
          actor,
        ),
      ).rejects.toThrow(AppException);
      expect(prisma.aiIntegration.update).not.toHaveBeenCalled();
    });

    it('excludes the integration itself when clearing other defaults', async () => {
      prisma.aiIntegration.findFirst.mockResolvedValue({
        id: 'integration-1',
        name: 'Team OpenAI',
      });
      prisma.aiIntegration.update.mockResolvedValue({
        id: 'integration-1',
        apiKeyEncrypted: null,
      });

      await service.updateIntegration(
        'org-1',
        'integration-1',
        { isDefault: true } as never,
        actor,
      );

      expect(prisma.aiIntegration.updateMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          isDefault: true,
          id: { not: 'integration-1' },
        },
        data: { isDefault: false },
      });
    });

    it('only re-encrypts the apiKey when a new one is actually provided', async () => {
      prisma.aiIntegration.findFirst.mockResolvedValue({
        id: 'integration-1',
        name: 'Team OpenAI',
      });
      prisma.aiIntegration.update.mockResolvedValue({
        id: 'integration-1',
        apiKeyEncrypted: null,
      });

      await service.updateIntegration(
        'org-1',
        'integration-1',
        { name: 'Renamed' } as never,
        actor,
      );

      expect(crypto.encrypt).not.toHaveBeenCalled();
      expect(prisma.aiIntegration.update).toHaveBeenCalledWith({
        where: { id: 'integration-1' },
        data: { name: 'Renamed' },
      });
    });
  });

  describe('removeIntegration', () => {
    it('throws not-found for an integration outside the organization', async () => {
      prisma.aiIntegration.findFirst.mockResolvedValue(null);

      await expect(
        service.removeIntegration('org-1', 'integration-from-other-org', actor),
      ).rejects.toThrow(AppException);
      expect(prisma.aiIntegration.delete).not.toHaveBeenCalled();
    });

    it('deletes an in-tenant integration and audits it', async () => {
      prisma.aiIntegration.findFirst.mockResolvedValue({
        id: 'integration-1',
        name: 'Team OpenAI',
      });

      const result = await service.removeIntegration(
        'org-1',
        'integration-1',
        actor,
      );

      expect(prisma.aiIntegration.delete).toHaveBeenCalledWith({
        where: { id: 'integration-1' },
      });
      expect(result).toEqual({ id: 'integration-1', deleted: true });
    });
  });

  describe('resolveAdapter', () => {
    it('falls back to the local Ollama provider when there is no default integration', async () => {
      prisma.aiIntegration.findFirst.mockResolvedValue(null);
      prisma.aiProvider.findUnique.mockResolvedValue({
        isEnabled: true,
        baseUrl: 'http://localhost:11434',
        defaultModel: 'llama3.1',
      });

      const result = await service.resolveAdapter('org-1');

      expect(result.adapter).toBeInstanceOf(OllamaAdapter);
      expect(result.model).toBe('llama3.1');
      expect(result.sanitize).toBe(true);
      expect(result.integrationId).toBeUndefined();
    });

    it('throws when no Ollama provider is enabled and there is no default integration', async () => {
      prisma.aiIntegration.findFirst.mockResolvedValue(null);
      prisma.aiProvider.findUnique.mockResolvedValue({ isEnabled: false });

      await expect(service.resolveAdapter('org-1')).rejects.toThrow(
        AppException,
      );
    });

    it('throws unprocessable for a default external integration (not yet implemented behind the adapter interface)', async () => {
      prisma.aiIntegration.findFirst.mockResolvedValue({
        id: 'integration-1',
        apiKeyEncrypted: 'enc(secret-key)',
        sanitizeContext: false,
        provider: { providerType: 'OPENAI' },
      });

      await expect(service.resolveAdapter('org-1')).rejects.toThrow(
        AppException,
      );
    });

    it('throws when the default external integration has no usable API key', async () => {
      prisma.aiIntegration.findFirst.mockResolvedValue({
        id: 'integration-1',
        apiKeyEncrypted: null,
        sanitizeContext: true,
        provider: { providerType: 'OPENAI' },
      });

      await expect(service.resolveAdapter('org-1')).rejects.toThrow(
        AppException,
      );
    });
  });
});
