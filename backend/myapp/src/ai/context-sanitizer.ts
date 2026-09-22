/**
 * Strips likely secrets and direct personal identifiers from text before it
 * reaches an AI provider — required for opt-in external providers, and applied
 * uniformly so the local-first default behaves the same way.
 */
const PATTERNS: [RegExp, string][] = [
  [
    /[A-Za-z0-9_-]*(?:ghp|gho|ghu|ghs|glpat|sk|pk)_[A-Za-z0-9]{16,}/g,
    '[REDACTED_TOKEN]',
  ],
  [
    /-----BEGIN [A-Z ]+-----[\s\S]+?-----END [A-Z ]+-----/g,
    '[REDACTED_KEY_BLOCK]',
  ],
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED_EMAIL]'],
  [/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[REDACTED_IP]'],
  [/(password|secret|token|api[_-]?key)\s*[:=]\s*\S+/gi, '$1=[REDACTED]'],
];

export function sanitizeForAi(text: string): string {
  return PATTERNS.reduce(
    (value, [pattern, replacement]) => value.replace(pattern, replacement),
    text,
  );
}
