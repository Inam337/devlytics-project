/**
 * Single source of truth for runtime configuration. Everything is read from the
 * environment — no credential, secret or provider URL is hardcoded anywhere else.
 */

const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBool = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value === '') return fallback;
  return value.toLowerCase() === 'true' || value === '1';
};

const toList = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const configuration = () => ({
  app: {
    name: process.env.APP_NAME ?? 'Devlytics',
    env: process.env.NODE_ENV ?? 'development',
    port: toInt(process.env.PORT, 3000),
    apiPrefix: process.env.API_PREFIX ?? 'api/v1',
    url: process.env.APP_URL ?? 'http://localhost:3000',
    logLevel: process.env.LOG_LEVEL ?? 'log',
    corsOrigins: toList(process.env.CORS_ORIGINS),
  },
  database: {
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: toInt(process.env.DATABASE_PORT, 5432),
    name: process.env.DATABASE_NAME ?? 'devlytics_db',
    user: process.env.DATABASE_USER ?? 'devlytics',
    password: process.env.DATABASE_PASSWORD ?? '',
    schema: process.env.DATABASE_SCHEMA ?? 'public',
    url: process.env.DATABASE_URL ?? '',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: toInt(process.env.REDIS_PORT, 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    db: toInt(process.env.REDIS_DB, 0),
    queuePrefix: process.env.QUEUE_PREFIX ?? 'devlytics',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? '',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET ?? '',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    passwordResetExpiresMinutes: toInt(process.env.PASSWORD_RESET_EXPIRES_MINUTES, 30),
  },
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY ?? '',
    throttleTtlSeconds: toInt(process.env.THROTTLE_TTL_SECONDS, 60),
    throttleLimit: toInt(process.env.THROTTLE_LIMIT, 120),
  },
  git: {
    github: {
      apiUrl: process.env.GITHUB_API_URL ?? 'https://api.github.com',
      clientId: process.env.GITHUB_CLIENT_ID ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
      webhookSecret: process.env.GITHUB_WEBHOOK_SECRET ?? '',
      scopes: toList(process.env.GITHUB_SCOPES) ?? [],
    },
    gitlab: {
      apiUrl: process.env.GITLAB_API_URL ?? 'https://gitlab.com/api/v4',
      clientId: process.env.GITLAB_CLIENT_ID ?? '',
      clientSecret: process.env.GITLAB_CLIENT_SECRET ?? '',
      webhookSecret: process.env.GITLAB_WEBHOOK_SECRET ?? '',
      scopes: toList(process.env.GITLAB_SCOPES) ?? [],
    },
  },
  ai: {
    defaultProvider: process.env.AI_DEFAULT_PROVIDER ?? 'OLLAMA',
    sanitizeContext: toBool(process.env.AI_SANITIZE_CONTEXT, true),
    requestTimeoutMs: toInt(process.env.AI_REQUEST_TIMEOUT_MS, 120_000),
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL ?? 'llama3.1',
    },
    openaiApiKey: process.env.OPENAI_API_KEY ?? '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
    geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  },
  sync: {
    historyMonths: toInt(process.env.SYNC_HISTORY_MONTHS, 12),
    reconcileIntervalMinutes: toInt(process.env.SYNC_RECONCILE_INTERVAL_MINUTES, 5),
    goalAtRiskDays: toInt(process.env.GOAL_AT_RISK_DAYS, 14),
    inactivitySuspendDays: toInt(process.env.INACTIVITY_SUSPEND_DAYS, 90),
  },
});

export type AppConfig = ReturnType<typeof configuration>;
