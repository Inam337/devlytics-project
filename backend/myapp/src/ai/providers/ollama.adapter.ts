import {
  AiCompletionRequest,
  AiCompletionResult,
  AiProviderAdapter,
  AiProviderError,
} from './ai-provider.adapter';

interface OllamaGenerateResponse {
  response?: string;
  prompt_eval_count?: number;
  eval_count?: number;
}

/** Local-first default provider (docs requirements §11: "Ollama / Local AI"). */
export class OllamaAdapter implements AiProviderAdapter {
  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly timeoutMs = 120_000,
  ) {}

  async complete(request: AiCompletionRequest): Promise<AiCompletionResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          system: request.systemPrompt,
          prompt: request.userPrompt,
          stream: false,
          options: { temperature: request.temperature, num_predict: request.maxTokens },
        }),
      });

      if (!response.ok) {
        throw new AiProviderError(`Ollama responded ${response.status}`, response.status >= 500);
      }

      const payload = (await response.json()) as OllamaGenerateResponse;
      return {
        content: payload.response ?? '',
        promptTokens: payload.prompt_eval_count ?? 0,
        completionTokens: payload.eval_count ?? 0,
      };
    } catch (error) {
      if (error instanceof AiProviderError) throw error;
      throw new AiProviderError(
        `Could not reach Ollama at ${this.baseUrl}: ${(error as Error).message}`,
        true,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
