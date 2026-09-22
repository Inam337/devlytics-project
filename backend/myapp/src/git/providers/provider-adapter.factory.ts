import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GitProvider } from '@prisma/client';
import { AppException } from '../../common/exceptions/app.exception';
import { CryptoService } from '../../common/services/crypto.service';
import { GitProviderAdapter } from './git-provider.adapter';
import { GithubAdapter } from './github.adapter';
import { GitlabAdapter } from './gitlab.adapter';

/**
 * Builds the right adapter for a stored provider connection and decrypts its
 * access token. Every consumer takes the adapter from here, so provider-specific
 * construction never leaks into a service.
 */
@Injectable()
export class ProviderAdapterFactory {
  constructor(
    private readonly crypto: CryptoService,
    private readonly config: ConfigService,
  ) {}

  create(provider: GitProvider): GitProviderAdapter {
    const token = this.crypto.decrypt(provider.accessTokenEncrypted);
    if (!token) {
      throw AppException.unprocessable(
        `No usable access token is stored for ${provider.displayName}. Reconnect the provider.`,
      );
    }
    return this.build(provider.providerType, provider.baseUrl, token);
  }

  /** Used during the connect flow, before the provider row exists. */
  createForToken(
    providerType: GitProvider['providerType'],
    token: string,
    baseUrl?: string,
  ): GitProviderAdapter {
    return this.build(
      providerType,
      baseUrl ?? this.defaultBaseUrl(providerType),
      token,
    );
  }

  defaultBaseUrl(providerType: GitProvider['providerType']): string {
    return providerType === 'GITHUB'
      ? this.config.get<string>('git.github.apiUrl', 'https://api.github.com')
      : this.config.get<string>(
          'git.gitlab.apiUrl',
          'https://gitlab.com/api/v4',
        );
  }

  private build(
    providerType: GitProvider['providerType'],
    baseUrl: string,
    token: string,
  ): GitProviderAdapter {
    const timeoutMs = 30_000;
    switch (providerType) {
      case 'GITHUB':
        return new GithubAdapter(baseUrl, token, timeoutMs);
      case 'GITLAB':
        return new GitlabAdapter(baseUrl, token, timeoutMs);
      default:
        throw AppException.badRequest(
          `Unsupported Git provider: ${String(providerType)}`,
        );
    }
  }
}
