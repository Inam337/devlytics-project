import { useCallback } from 'react';

import { useT } from '@/hooks/use-t';
import type { TranslationFunction } from '@/validation-schemas';

/** i18next helper for auth forms and Zod schemas */
export function useAuthTranslation() {
  const { t: translate } = useT();
  const t: TranslationFunction = useCallback(
    (id, defaultMessage, values) => translate(id, defaultMessage, values),
    [translate],
  );
  const i18nT = useCallback(
    (id: string, defaultMessage?: string) => translate(id, defaultMessage),
    [translate],
  );
  const resolveAuthMessage = useCallback(
    (message: string) => (message.startsWith('auth.') ? i18nT(message) : message),
    [i18nT],
  );

  return { t, i18nT, resolveAuthMessage };
}
