import { Logger } from '@nestjs/common';

const REQUIRED_KEYS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'ENCRYPTION_KEY',
];

const INSECURE_DEFAULTS = [
  'change-me-in-production',
  'change-me-access-secret',
  'change-me-refresh-secret',
];

/**
 * Fails fast when the process is missing configuration it cannot invent, and
 * refuses to boot production with the placeholder secrets from `.env.example`.
 */
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const logger = new Logger('Config');
  const missing = REQUIRED_KEYS.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. See .env.example.`,
    );
  }

  const encryptionKey = String(config.ENCRYPTION_KEY);
  if (encryptionKey.length < 32) {
    throw new Error(
      'ENCRYPTION_KEY must be at least 32 characters (256-bit key material).',
    );
  }

  if (config.NODE_ENV === 'production') {
    const insecure = REQUIRED_KEYS.filter((key) =>
      INSECURE_DEFAULTS.some((placeholder) =>
        String(config[key] ?? '').includes(placeholder),
      ),
    );
    if (insecure.length > 0) {
      throw new Error(
        `Refusing to start in production with placeholder secrets: ${insecure.join(', ')}.`,
      );
    }
  } else {
    logger.log(
      `Configuration loaded for NODE_ENV=${config.NODE_ENV ?? 'development'}`,
    );
  }

  return config;
}
