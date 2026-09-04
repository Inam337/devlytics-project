export type TranslationFunction = (
  id: string,
  defaultMessage: string,
  values?: Record<string, string | number>,
) => string;
