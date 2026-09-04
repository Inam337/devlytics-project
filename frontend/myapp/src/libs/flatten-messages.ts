/** Flatten nested locale JSON for react-intl dot-notation ids (e.g. auth.login.title). */
export function flattenMessages(
  nested: Record<string, unknown>,
  prefix = '',
): Record<string, string> {
  return Object.entries(nested).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      acc[path] = value;
      return acc;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(acc, flattenMessages(value as Record<string, unknown>, path));
    }

    return acc;
  }, {});
}
