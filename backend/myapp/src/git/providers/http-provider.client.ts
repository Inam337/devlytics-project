import { Logger } from '@nestjs/common';
import { ProviderRequestError } from './git-provider.adapter';

export interface HttpClientOptions {
  baseUrl: string;
  token: string;
  authScheme: 'Bearer' | 'PRIVATE-TOKEN';
  timeoutMs?: number;
}

/**
 * Shared HTTP plumbing for the provider adapters: auth headers, timeouts, error
 * classification and link/page-based pagination. GitHub and GitLab differ only
 * in their routes and payload shapes, so this lives in one place.
 */
export class HttpProviderClient {
  private readonly logger: Logger;

  constructor(
    private readonly options: HttpClientOptions,
    loggerContext: string,
  ) {
    this.logger = new Logger(loggerContext);
  }

  async get<T>(
    path: string,
    query: Record<string, string | number | undefined> = {},
  ): Promise<T> {
    const url = this.buildUrl(path, query);
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.options.timeoutMs ?? 30_000,
    );

    try {
      const response = await fetch(url, {
        headers: this.headers(),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw this.toProviderError(
          response.status,
          await this.safeBody(response),
          response,
        );
      }
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ProviderRequestError) throw error;
      if ((error as Error).name === 'AbortError') {
        throw new ProviderRequestError(`Request to ${path} timed out`, 504);
      }
      throw new ProviderRequestError(
        `Request to ${path} failed: ${(error as Error).message}`,
        502,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Walks page-numbered results until a short page is returned or `maxPages` is
   * reached, so a large history cannot run unbounded.
   */
  async getPaged<T>(
    path: string,
    query: Record<string, string | number | undefined> = {},
    perPage = 100,
    maxPages = 10,
  ): Promise<T[]> {
    const results: T[] = [];
    for (let page = 1; page <= maxPages; page += 1) {
      const batch = await this.get<T[]>(path, {
        ...query,
        per_page: perPage,
        page,
      });
      if (!Array.isArray(batch) || batch.length === 0) break;
      results.push(...batch);
      if (batch.length < perPage) break;
    }
    return results;
  }

  private buildUrl(
    path: string,
    query: Record<string, string | number | undefined>,
  ): string {
    const url = new URL(
      path.startsWith('http')
        ? path
        : `${this.options.baseUrl.replace(/\/$/, '')}${path}`,
    );
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '')
        url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  private headers(): Record<string, string> {
    return this.options.authScheme === 'Bearer'
      ? {
          Authorization: `Bearer ${this.options.token}`,
          Accept: 'application/json',
        }
      : { 'PRIVATE-TOKEN': this.options.token, Accept: 'application/json' };
  }

  private async safeBody(response: Response): Promise<string> {
    try {
      return (await response.text()).slice(0, 500);
    } catch {
      return '';
    }
  }

  private toProviderError(
    status: number,
    body: string,
    response: Response,
  ): ProviderRequestError {
    const remaining = response.headers.get('x-ratelimit-remaining');
    const rateLimited = status === 429 || (status === 403 && remaining === '0');
    const tokenExpired = status === 401;

    if (rateLimited) {
      this.logger.warn(
        'Provider rate limit reached — remaining requests will be retried',
      );
    }

    return new ProviderRequestError(
      `Provider responded ${status}: ${body || 'no body'}`,
      status,
      rateLimited,
      tokenExpired,
    );
  }
}
