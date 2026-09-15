export interface AiCompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  temperature: number;
}

export interface AiCompletionResult {
  content: string;
  promptTokens: number;
  completionTokens: number;
}

/**
 * Provider-neutral contract for the interpretation layer. Ollama is the
 * default, local-first implementation; OpenAI/Claude/Gemini can implement the
 * same interface later without touching `AiAnalysisService`.
 */
export interface AiProviderAdapter {
  complete(request: AiCompletionRequest): Promise<AiCompletionResult>;
}

export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly unavailable = false,
  ) {
    super(message);
    this.name = 'AiProviderError';
  }
}
